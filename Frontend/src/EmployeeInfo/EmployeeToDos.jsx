import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate } from "../utils/dateFormatter";
import api from "../utils/axiosInstance";
import Paginator from "../Paginator";

const IconCheck = () => (
  <svg
    className="w-3 h-3"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 16 12"
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="3"
      d="M1 5.917 5.724 10.5 15 1.5"
    />
  </svg>
);
const IconEdit = () => (
  <svg
    className="w-4 h-4"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    viewBox="0 0 20 18"
  >
    <path d="M12.687 14.408a3.01 3.01 0 0 1-1.533.821l-3.566.713a3 3 0 0 1-3.53-3.53l.713-3.566a3.01 3.01 0 0 1 .821-1.533L10.905 2H2.167A2.169 2.169 0 0 0 0 4.167v11.666A2.169 2.169 0 0 0 2.167 18h11.666A2.169 2.169 0 0 0 16 15.833V11.1l-3.313 3.308Zm5.53-9.065.546-.546a2.518 2.518 0 0 0 0-3.56 2.576 2.576 0 0 0-3.559 0l-.547.547 3.56 3.56Z" />
    <path d="M13.243 3.2 7.359 9.081a.5.5 0 0 0-.136.256L6.51 12.9a.5.5 0 0 0 .59.59l3.566-.713a.5.5 0 0 0 .255-.136L16.8 6.757 13.243 3.2Z" />
  </svg>
);
const IconTrash = () => (
  <svg
    className="w-4 h-4"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 18 20"
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M1 5h16M7 8v8m4-8v8M7 1h4a1 1 0 0 1 1 1v3H6V2a1 1 0 0 1 1-1ZM3 5h12v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5Z"
    />
  </svg>
);

export default function EmployeeTodos({ passedToDos, employeeId }) {
  const [todos, setTodos] = useState(passedToDos);

  //Pagination state
  const pageSize = 6;
  const [pageIndex, setPageIndex] = useState(0);
  const totalCount = todos.length;
  const pageCount = Math.ceil(totalCount / pageSize);

  const start = pageIndex * pageSize;
  const end = start + pageSize;
  const startIndex = totalCount === 0 ? 0 : start + 1;
  const endIndex = Math.min(end, totalCount);
  const canPrevious = pageIndex > 0;
  const canNext = pageIndex < pageCount - 1;

  const paginatedTodos = todos.slice(start, end);

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

  const [filter, setFilter] = useState("active"); // 'all' | 'active'
  const [isAdding, setIsAdding] = useState(false);
  const [newTodoContent, setNewTodoContent] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editVal, setEditVal] = useState("");


  const handleToggle = async (id) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );

    const toggled = todos.find((t) => t.id == id);

    const updateTodo = {
      id: id,
      completed: !toggled.completed,
    };

    await api
      .patch("/Employee/UpdateToDoCompletion", updateTodo)
      .catch((err) => {
        toast.error("Error while updating the ToDo.");
        setTodos((prev) =>
            prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
        );
      });

    setTimeout(() => refreshToDos(filter === 'all'), 1800); 
  };

  useEffect(() => { 
    if (filter === 'all') { 
      refreshToDos(true);
    }
    else { 
      refreshToDos(false); 
    }
  }, [filter]); 

  const refreshToDos = async (all) => {
    if (all) {
      var refreshTodosResult = await api.get(
        `/Employee/GetToDos?employeeId=${employeeId}&all=true`,
      );
    } else {
      var refreshTodosResult = await api.get(
        `/Employee/GetToDos?employeeId=${employeeId}`,
      );
    }
    setTodos(refreshTodosResult.data);
  };

  const handleDeleteTodo = async (id) => {
    await api.delete(`/Employee/DeleteToDo?toDoId=${id}`).catch(() => {
      toast.error("The ToDo couldn't be deleted");
    });

    refreshToDos();
  };

  const handleAddTodo = () => {
    setIsAdding(true);
    setPageIndex(0);
  };

  const handleSaveTodo = async () => {
    if (newTodoContent.trim() === "") {
      toast.error("ToDo content can't be empty.");
      return;
    }

    const createTodo = {
      employeeId: employeeId,
      content: newTodoContent,
      dueDateTime: null,
    };

    await api
      .post("/Employee/CreateToDo", createTodo)
      .then(() => {
        setNewTodoContent("");
        setIsAdding(false);
      })
      .catch((err) => {
        toast.error("Error while creating new ToDo.");
      });

    await refreshToDos();
  };

  const handleCancelTodo = () => {
    setNewTodoContent("");
    setIsAdding(false);
  };

  const handleTodoKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveTodo();
    }
  };

  const handleEditTodo = (todo) => {
    setEditingId(todo.id);
    setEditVal(todo.content);
  };

  const handleSaveEdit = async () => {
    if (editVal.trim() === "") {
      toast.error("ToDo content can't be empty.");
      return;
    }

    var updateToDo = {
      id: editingId,
      content: editVal,
    };

    await api
      .patch("/Employee/UpdateToDoContent", updateToDo)
      .then(() => {
        setEditingId(null);
        setEditVal("");
      })
      .catch((err) => {
        toast.error("Error while updating the ToDo.");
      });

    await refreshToDos();
  };

  return (
    <div className="bg-white rounded-lg shadow px-6  pb-6 pt-3 dark:bg-gray-800 dark:border-gray-700 dark:border">
      {/* Header with Left Tabs and Right Action */}
      <div className=" bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          {/* Left Side: Navigation Tabs */}

          <div className="w-full flex justify-between items-start pt-6">
            <div className="flex flex-col">
              <h3 className="px-2 text-sm font-semibold text-gray-700 dark:text-white uppercase tracking-wide">
                To-Do
              </h3>
              <div className="flex space-x-3">
                <button
                  onClick={() => setFilter("active")}
                  className={`pt-6 pb-3 px-3 text-sm font-medium transition-all relative ${
                    filter === "active"
                      ? "text-blue-700"
                      : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  Active Tasks
                  {filter === "active" && (
                    <motion.div
                      layoutId="tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-700 rounded-full"
                    />
                  )}
                </button>
                <button
                  onClick={() => setFilter("all")}
                  className={`pt-6 pb-3 px-3 text-sm font-medium transition-all relative ${
                    filter === "all"
                      ? "text-blue-700"
                      : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  All History
                  {filter === "all" && (
                    <motion.div
                      layoutId="tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-700 rounded-full"
                    />
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4 justify-center">
              <button
                onClick={handleAddTodo}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-700 text-white text-sm font-medium rounded-full hover:bg-blue-800 transition"
              >
                + Add ToDo
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg">
        {/* Add Task Inline Form */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-6"
            >
              <div
                onSubmit={handleSaveTodo}
                className="p-4 bg-white border border-blue-200 rounded-lg shadow-sm"
              >
                <label
                  htmlFor="task"
                  className="block mb-2 text-sm font-medium text-gray-900"
                >
                  Task Description
                </label>
                <textarea
                  id="task"
                  autoFocus
                  value={newTodoContent}
                  onChange={(e) => setNewTodoContent(e.target.value)}
                  onKeyDown={handleTodoKeyDown}
                  className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="What needs to be done?"
                  rows="3"
                />
                <div className="flex mt-4 space-x-2">
                  <button
                    type="submit"
                    className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2 text-center"
                    onClick={handleSaveTodo}
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelTodo}
                    className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2 hover:text-gray-900 focus:z-10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Todo List Container */}
        
          {paginatedTodos.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {paginatedTodos.map((todo) => {
                const isEdit = editingId === todo.id;
                return (
                  <li
                    key={todo.id}
                    className={`group p-4 transition-colors ${todo.completed ? "bg-gray-50/50" : "hover:bg-gray-50"}`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <div className="flex items-center h-5 mt-1">
                        <button
                          onClick={() => handleToggle(todo.id)}
                          className={`w-5 h-5 rounded border transition-all flex items-center justify-center focus:ring-4 focus:outline-none
                            ${
                              todo.completed
                                ? "bg-blue-600 border-blue-600 focus:ring-blue-300"
                                : "bg-white border-gray-300 hover:border-blue-500 focus:ring-blue-100"
                            }`}
                        >
                          {todo.completed && (
                            <span className="text-white">
                              <IconCheck />
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Content Column */}
                      <div className="flex-1 min-w-0">
                        {isEdit ? (
                          <div className="mt-1">
                            <textarea
                              value={editVal}
                              onChange={(e) => setEditVal(e.target.value)}
                              className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                              rows="3"
                            />
                            <div className="flex mt-3 space-x-2">
                              <button
                                onClick={handleSaveEdit}
                                className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-xs px-3 py-2"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="py-2 px-3 text-xs font-medium text-gray-900 bg-white rounded-lg border border-gray-200 hover:bg-gray-100"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p
                              className={`text-sm font-medium leading-relaxed ${todo.completed ? "text-gray-400 line-through" : "text-gray-900"}`}
                            >
                              {todo.content}
                            </p>
                            <div className="text-xs text-gray-500 flex justify-start  mt-3">
                              <span className="group-hover:text-gray-700 mr-2">
                                {todo.author}
                              </span>
                              <span className="flex items-center">
                                <span className="w-1 h-1 bg-slate-200 rounded-full mr-2" />
                                {formatDate(todo.createdDateTime)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {(!isEdit && !todo.completed) && (
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditTodo(todo)}
                            className="p-2 text-gray-500 rounded-lg hover:text-blue-600 hover:bg-blue-50 focus:ring-4 focus:ring-gray-100"
                          >
                            <IconEdit />
                          </button>
                          <button
                            onClick={() => handleDeleteTodo(todo.id)}
                            className="p-2 text-gray-500 rounded-lg hover:text-red-600 hover:bg-red-50 focus:ring-4 focus:ring-gray-100"
                          >
                            <IconTrash />
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                No tasks found
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                You've cleared your list! Time to celebrate or add a new task.
              </p>
              <button
                onClick={() => setIsAdding(true)}
                className="text-blue-700 hover:text-white border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-all"
              >
                Add first task
              </button>
            </div>
          )}
      </div>
      
           {todos?.length > 0 && <Paginator
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
            />}
    </div>
  );
}
