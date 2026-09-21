import { useEffect, useState } from "react";
import {
  IoCheckmarkSharp,
  IoChevronDown,
  IoChevronUp,
  IoClose,
} from "react-icons/io5";
import { motion, AnimatePresence } from "framer-motion";
import { LuPencil, LuTrash2 } from "react-icons/lu";
import api from "../utils/axiosInstance";
import { toast } from "react-toastify";
import Paginator from "../Paginator";
import { formatDate } from "../utils/dateFormatter";

export default function EmployeeNotes({ passedNotes, employeeId }) {
  const [notes, setNotes] = useState(passedNotes);

  //Pagination state
  const pageSize = 6;
  const [pageIndex, setPageIndex] = useState(0);
  const totalCount = notes.length;
  const pageCount = Math.ceil(totalCount / pageSize);

  const start = pageIndex * pageSize;
  const end = start + pageSize;
  const startIndex = totalCount === 0 ? 0 : start + 1;
  const endIndex = Math.min(end, totalCount);
  const canPrevious = pageIndex > 0;
  const canNext = pageIndex < pageCount - 1;

  const paginatedNotes = notes.slice(start, end);

  const handlePreviousPage = () => {
    if (!canPrevious) return;
    setPageIndex((prev) => prev - 1);
  };

  const handleNextPage = () => {
    if (!canNext) return;
    setPageIndex((prev) => prev + 1);
  };

  useEffect(() => {
    if (pageIndex >= pageCount && pageCount > 0) {
      setPageIndex(pageCount - 1);
    }

    if (pageCount === 0 && pageIndex !== 0) {
      setPageIndex(0);
    }
  }, [totalCount, pageCount]);
  //Pagination state

  const [expandedNoteIds, setExpandedNoteIds] = useState([]);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [viewMode, setViewMode] = useState("grid");

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editContent, setEditContent] = useState("");

  const refreshNotes = async () => {
    var refreshNotesResult = await api.get(
      `/Employee/GetNotes?employeeId=${employeeId}`,
    );
    setNotes(refreshNotesResult.data);
  };

  const handleEditNote = (note) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  };

  const handleSaveEdit = async () => {
    if (editContent.trim() === "") {
      toast.error("Note content can't be empty.");
      return;
    }

    var updateNote = {
      id: editingNoteId,
      content: editContent,
    };

    await api
      .patch("/Employee/UpdateNoteContent", updateNote)
      .then(() => {
        setEditingNoteId(null);
        setEditContent("");
      })
      .catch(() => {
        toast.error("Error while updating selected note.");
      });

    await refreshNotes();
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditContent("");
  };

  const handleDeleteNote = async (id) => {
    await api.delete(`/Employee/DeleteNote?noteId=${id}`).catch(() => {
      toast.error("Selected note couldn't be deleted");
    });

    refreshNotes();
  };

  const handleEmojiClick = (emoji) => {
    setNewNoteContent((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const toggleExpand = (id) => {
    setExpandedNoteIds((prev) =>
      prev.includes(id)
        ? prev.filter((noteId) => noteId !== id)
        : [...prev, id],
    );
  };

  const handleAddNote = () => {
    setIsAdding(true);
    setPageIndex(0);
  };

  const handleSaveNote = async () => {
    if (newNoteContent.trim() === "") {
      toast.error("Note content can't be empty.");
      return;
    }

    const createNote = {
      employeeId: employeeId,
      content: newNoteContent,
    };

    await api
      .post("/Employee/CreateNote", createNote)
      .then(() => {
        setNewNoteContent("");
        setIsAdding(false);
      })
      .catch((err) => {
        toast.error("Error while creating new note.");
      });

    await refreshNotes();
  };

  const handleCancelNote = () => {
    setNewNoteContent("");
    setIsAdding(false);
  };

  const emojiList = ["😀", "👍", "🎉", "❤️", "🔥", "🚀"];

  const handleNoteKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveNote();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 dark:bg-gray-800 dark:border-gray-700 dark:border">
      <div className="w-full flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-white uppercase tracking-wide">
          Notes
        </h3>
        <div className="flex items-center gap-4 justify-center">
          <div className="relative group inline-block">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-full ${
                viewMode === "list" ? "bg-gray-300" : "hover:bg-gray-200"
              }`}
              aria-label="List view"
            >
              <svg
                className="w-5 h-5 text-gray-700 dark:text-white"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-width="2"
                  d="M9 8h10M9 12h10M9 16h10M4.99 8H5m-.02 4h.01m0 4H5"
                />
              </svg>
            </button>
            <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs font-medium py-1 px-2 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-10 shadow-md">
              List view
            </div>
          </div>

          <div className="relative group inline-block">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-full ${
                viewMode === "grid" ? "bg-gray-300" : "hover:bg-gray-200"
              }`}
              aria-label="Grid view"
            >
              <svg
                className="w-5 h-5 text-gray-700 dark:text-white"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  fill-rule="evenodd"
                  d="M4.857 3A1.857 1.857 0 0 0 3 4.857v4.286C3 10.169 3.831 11 4.857 11h4.286A1.857 1.857 0 0 0 11 9.143V4.857A1.857 1.857 0 0 0 9.143 3H4.857Zm10 0A1.857 1.857 0 0 0 13 4.857v4.286c0 1.026.831 1.857 1.857 1.857h4.286A1.857 1.857 0 0 0 21 9.143V4.857A1.857 1.857 0 0 0 19.143 3h-4.286Zm-10 10A1.857 1.857 0 0 0 3 14.857v4.286C3 20.169 3.831 21 4.857 21h4.286A1.857 1.857 0 0 0 11 19.143v-4.286A1.857 1.857 0 0 0 9.143 13H4.857Zm10 0A1.857 1.857 0 0 0 13 14.857v4.286c0 1.026.831 1.857 1.857 1.857h4.286A1.857 1.857 0 0 0 21 19.143v-4.286A1.857 1.857 0 0 0 19.143 13h-4.286Z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
            <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs font-medium py-1 px-2 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-10 shadow-md">
              Gallery view
            </div>
          </div>

          <button
            onClick={handleAddNote}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-700 text-white text-sm font-medium rounded-full hover:bg-blue-800 transition"
          >
            + Add Note
          </button>
        </div>
      </div>
      <div className="border-t border-gray-200 py-4 dark:border-gray-700 md:py-8">
        <div
          className={`${
            viewMode === "grid" ? "grid md:grid-cols-3 gap-6" : "space-y-4"
          }`}
        >
          <AnimatePresence>
            {isAdding && (
              <motion.div
                key="new-note"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  layout: { duration: 0.1, type: "spring", bounce: 0 },
                }}
                className="flex flex-col justify-between p-6 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md group relative overflow-hidden min-h-[160px] animate-fade-in"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400 rounded-bl-3xl rounded-tl-3xl" />

                <div class="w-full flex flex-row justify-between items-start mb-2">
                  <textarea
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    onKeyDown={handleNoteKeyDown}
                    placeholder="Enter note..."
                    className="w-full h-32 resize-none border-none focus:outline-none text-base text-gray-800 placeholder-gray-400 leading-relaxed mb-4"
                  />
                  <button
                    onClick={handleCancelNote}
                    className="text-gray-400 hover:text-gray-600 transition mt-1 ml-2 shrink-0"
                    aria-label="Cancel new note"
                  >
                    <IoClose className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500 font-medium flex gap-1 items-center jutsify-center">
                    <span className="text-gray-600">You</span> &bull;{" "}
                    <span className="text-gray-600">
                      {formatDate(new Date().toISOString())}
                    </span>
                  </div>

                  <div className="flex gap-1">
                    <div className="relative flex text-left items-cente justify-centerr">
                      <button
                        onClick={() => setShowEmojiPicker((prev) => !prev)}
                        type="button"
                        className="p-2 text-gray-500 rounded-full cursor-pointer hover:text-gray-900 hover:bg-gray-100"
                        aria-label="Add emoji"
                      >
                        <svg
                          class="w-4 h-4"
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM13.5 6a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm-7 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm3.5 9.5A5.5 5.5 0 0 1 4.6 11h10.81A5.5 5.5 0 0 1 10 15.5Z" />
                        </svg>
                      </button>
                      {showEmojiPicker && (
                        <div className="absolute bottom-10 -right-22 z-20 w-64 bg-white border border-gray-200 rounded-xl shadow-lg p-2 grid grid-cols-6 gap-1 before:content-[''] before:absolute before:bottom-[-15px] before:right-24 before:border-8 before:border-transparent before:border-t-white">
                          {emojiList.map((emoji, index) => (
                            <button
                              key={index}
                              onClick={() => handleEmojiClick(emoji)}
                              className="hover:bg-gray-100 rounded-md text-[18px] flex items-center justify-center h-8 w-8"
                              aria-label={`Insert emoji ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleSaveNote}
                      className="flex items-center gap-1 pr-4 pl-3 py-1.5 bg-yellow-400 text-sm text-gray-800 font-semibold rounded-full shadow hover:bg-yellow-300 transition-all"
                      aria-label="Save note"
                    >
                      <IoCheckmarkSharp className="w-4 h-4" />
                      Done
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {paginatedNotes?.map((note) => {
            const isExpanded = expandedNoteIds.includes(note.id);
            const isEditing = editingNoteId === note.id;

            return (
              <div
                key={note.id}
                className={`p-6 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md group relative overflow-hidden transition-all duration-300 ease-in-out ${
                  viewMode === "grid"
                    ? "min-h-[160px]"
                    : "flex items-start gap-4"
                }`}
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
                          aria-label="Cancel edit"
                        >
                          <IoClose className="w-4 h-4" /> Cancel
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          className="flex items-center gap-1.5 pr-4 pl-3 py-1.5 bg-yellow-400 text-sm text-gray-900 font-semibold rounded-full shadow hover:bg-yellow-300 transition-all"
                          aria-label="Save edit"
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
                          aria-label="Toggle expand note"
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
                            className="rounded-full text-gray-500 hover:text-gray-700
                          flex items-center justify-center gap-1.5 text-sm"
                            aria-label="Delete note"
                          >
                            <LuTrash2 className="w-3 h-3 mt-[1px]" /> Delete
                          </button>
                          <button
                            onClick={() => handleEditNote(note)}
                            className="text-yellow-500 hover:text-yellow-700
                          flex items-center justify-center gap-1.5 text-sm"
                            aria-label="Edit note"
                          >
                            <LuPencil className="w-3 h-3 mt-[1px]" /> Edit
                          </button>
                        </div>
                      )}

                      <div className="text-sm text-gray-500 flex justify-between font-medium mt-3">
                        <span className="group-hover:text-gray-700">
                          {note.author}
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
          {notes.length === 0 && !isAdding && (
            <div className="text-[14px] text-gray-400 text-base pt-6">
              No notes yet. Be the first to add one today!
            </div>
          )}
        </div>
      </div>

      {notes.length > 0 && (
        <Paginator
          startIndex={startIndex}
          endIndex={endIndex}
          totalCount={totalCount}
          canPrevious={canPrevious}
          handlePreviousPage={handlePreviousPage}
          pageCount={pageCount}
          pageIndex={pageIndex}
          setPageIndex={setPageIndex}
          canNext={canNext}
          handleNextPage={handleNextPage}
        />
      )}
    </div>
  );
}
