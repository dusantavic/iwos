import { useState, useMemo, useEffect } from "react";
import {
  IoChevronDown,
  IoChevronUp,
  IoFilter,
  IoClose,
  IoCheckmarkSharp,
} from "react-icons/io5";
import { LuTrash2, LuPencil } from "react-icons/lu";
import { toast } from "react-toastify";
import api from "../utils/axiosInstance";
import { Link } from "react-router-dom";
import Skeleton from "./Skeleton";

const groupingOptions = [
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
  { key: "author", label: "Author" },
  { key: "employee", label: "Employee" },
];

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function NotesPage() {
  const [loading, setLoading] = useState(true); 
  const [notes, setNotes] = useState([]);

  const [grouping, setGrouping] = useState("month");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(new Set());
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [localNotes, setLocalNotes] = useState(notes);

  const fetchNotes = async () => {
    try {
      const response = await api.get("/Employee/GetNotes");
      setNotes(response.data);
      setLocalNotes(response.data);
    } catch (error) {
      toast.error("Error while fetching notes");
      console.log("Error while fetching notes", error);
    }
    finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const toggleExpand = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleEditNote = (note) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const handleSaveEdit = async () => {
    if (editContent.trim() === "") {
      toast.error("Note content can't be empty");
      return;
    }

    var updateNote = {
      id: editingId,
      content: editContent,
    };

    await api
      .patch("/Employee/UpdateNoteContent", updateNote)
      .then(() => {
        setEditingId(null);
        setEditContent("");
      })
      .catch(() => {
        toast.error("Error while updating selected note.");
      });

    await fetchNotes();
  };

  const handleDeleteNote = async (id) => {
    await api.delete(`/Employee/DeleteNote?noteId=${id}`).catch(() => {
      toast.error("Selected note couldn't be deleted.");
    });

    fetchNotes();
  };

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const filtered = useMemo(
    () =>
      localNotes.filter(
        (n) =>
          n.content.toLowerCase().includes(search.toLowerCase()) ||
          n.author.toLowerCase().includes(search.toLowerCase()) ||
          n.employee.toLowerCase().includes(search.toLowerCase())
      ),
    [localNotes, search]
  );

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((note) => {
      const d = new Date(note.createdDateTime);
      let key = "";
      switch (grouping) {
        case "month":
          key = `${d.getFullYear()}-${d.getMonth()}`;
          break;
        case "year":
          key = `${d.getFullYear()}`;
          break;
        case "author":
          key = note.author;
          break;
        case "employee":
          key = note.employee;
          break;
      }
      map.has(key) ? map.get(key).push(note) : map.set(key, [note]);
    });
    return Array.from(map.entries())
      .sort((a, b) =>  { 
        if (grouping === "month") { 
          const [aYear, aMonth] = a[0].split("-").map(Number); 
          const [bYear, bMonth] = b[0].split("-").map(Number); 

          if (aYear !== bYear) return bYear - aYear; 
          return bMonth - aMonth;
        }

        return a[0] < b[0] ? 1 : -1
      })
      .map(([key, arr]) => {
        const label =
          grouping === "month"
            ? `${monthNames[+key.split("-")[1]]} ${key.split("-")[0]}`
            : key;
        arr.sort(
          (a, b) => new Date(b.createdDateTime) - new Date(a.createdDateTime)
        );
        return { label, notes: arr };
      });
  }, [filtered, grouping]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-4">
      {loading && <Skeleton />}
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold mb-4 md:mb-0">All Notes</h1>
        <div className="flex items-center space-x-2 w-full md:w-auto"></div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between mb-6">
        <div className="flex space-x-2 overflow-x-auto">
          {groupingOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setGrouping(opt.key)}
              className={`px-4 py-2 text-sm font-semibold rounded-full transition ${
                grouping === opt.key
                  ? "bg-yellow-400 text-white shadow-inner"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex gap-4">
          <div className="flex items-center space-x-2 mt-2 md:mt-0">
            <IoFilter className="text-gray-500" />
            <span className="text-sm text-gray-600">
              {filtered.length} notes
            </span>
          </div>

          <div>
            <div className="relative">
              <div className="absolute inset-y-0 rtl:inset-r-0 start-0 flex items-center ps-3 pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-500 dark:text-gray-400"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 20 20"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
                  />
                </svg>
              </div>
              <input
                type="text"
                id="table-search-users"
                value={search ?? ""}
                onChange={(e) => setSearch(e.target.value)}
                className="block p-2 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg w-80 bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="Search notes"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Note Sections */}
      {grouped.map((section) => (
        <div key={section.label} className="mb-8">
          <h2 className="text-xl font-semibold mb-4 border-b border-gray-200 pb-1">
            {section.label}
          </h2>
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`}
          >
            {section.notes.map((note) => {
              const isExpanded = expanded.has(note.id);
              const isEditing = editingId === note.id;
              return (
                <div
                  key={note.id}
                  className={`p-6 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md group relative overflow-hidden transition-all duration-300 ease-in-out ${"min-h-[160px]"}`}
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400 rounded-bl-3xl rounded-tl-3xl" />
                  <div className="flex-1 h-full flex flex-col">
                    {isEditing ? (
                      <>
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full h-32 resize-none border border-gray-200 rounded-md p-2 focus:outline-none text-base text-gray-800 placeholder-gray-400 leading-relaxed mb-3"
                        />
                        <div className="flex items-center justify-between gap-3">
                          <button
                            onClick={handleCancelEdit}
                            className="flex items-center gap-1.5 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                          >
                            <IoClose className="w-4 h-4" /> Cancel
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            className="flex items-center gap-1.5 pr-4 pl-3 py-1.5 bg-yellow-400 text-sm text-gray-900 font-semibold rounded-full shadow hover:bg-yellow-300 transition-all"
                          >
                            <IoCheckmarkSharp className="w-4 h-4" /> Save
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-2 flex-grow">
                          <p
                            className={`text-base text-gray-800 leading-relaxed group-hover:text-black overflow-hidden transition-all duration-300 ease-in-out ${
                              isExpanded ? "max-h-none" : "line-clamp-4"
                            }`}
                          >
                            {note.content}
                          </p>
                          <button
                            onClick={() => toggleExpand(note.id)}
                            className="text-gray-400 hover:text-gray-600 transition mt-1 ml-2 shrink-0"
                          >
                            {isExpanded ? (
                              <IoChevronUp className="w-5 h-5" />
                            ) : (
                              <IoChevronDown className="w-5 h-5" />
                            )}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="w-full flex gap-2 justify-between">
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="rounded-full text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1.5 text-sm"
                            >
                              <LuTrash2 className="w-3 h-3 mt-[1px]" /> Delete
                            </button>
                            <button
                              onClick={() => handleEditNote(note)}
                              className="text-yellow-500 hover:text-yellow-700 flex items-center justify-center gap-1.5 text-sm"
                            >
                              <LuPencil className="w-3 h-3 mt-[1px]" /> Edit
                            </button>
                          </div>
                        )}

                        <div className="text-sm text-gray-500 flex justify-between font-medium mt-3">
                          <span className="group-hover:text-gray-700">
                            {note.author} | for:{" "}
                            <Link
                              className="hover:underline"
                              to={`/employee/${note.employeeId}`}
                            >
                              {note.employee}
                            </Link>
                          </span>
                          <span className="group-hover:text-gray-700">
                            {formatDate(note.createdDateTime)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
