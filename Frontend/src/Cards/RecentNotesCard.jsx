import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../utils/axiosInstance";
import dayjs from "dayjs";
import { defaultProfile } from "../assets";
import { Link } from "react-router-dom";
import { getUser } from "../utils/authService";


export default function RecentNotesCard() {

    const user = getUser();
    const [recentNotes, setRecentNotes] = useState(null); 

    const fetchRecentNotes = async () => { 
        try { 
            var result = await api.get('/Employee/GetRecentNotes'); 
            setRecentNotes(result.data); 
        }
        catch (error) { 
            toast.error("Error while fetching recent notes"); 
            console.log("Error while fetching recent notes", error); 
        }
    }

    useEffect(() => { 
        fetchRecentNotes(); 
    }, []); 

    return (
        <div className="w-full p-6 bg-white border border-gray-200 rounded-xl shadow-md dark:bg-gray-800 dark:border-gray-700">
            <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Recent Notes</h2>
            </div>

            <div className="space-y-6">
                {recentNotes?.map((item, idx) => (
                    <section key={idx} className="bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-lg p-5">
                        <header className="text-lg font-bold text-gray-800 dark:text-white mb-3">{item.month}</header>
                        <ol className="space-y-4">
                            {item.notes.map((note, index) => (
                                <li key={index} className="transition-colors duration-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600">
                                    <Link to={`/employee/${note.employeeId}`} className="flex items-start gap-4 p-3">
                                        <img
                                            src={(note.profilePictureSrc == null || note.profilePictureSrc == "")
                                                 ? defaultProfile : `${import.meta.env.VITE_ASSETS_BASE_URL}/${note.profilePictureSrc}`}
                                            alt={`${note.fullName}'s profile`}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                        <div className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                                            <p className="mb-1">
                                                {note.authorId == user.id ? 'You' : note.author} added a note for{' '}
                                                <span className="font-medium text-gray-900 dark:text-white">{note.fullName}</span>
                                            </p>
                                            <blockquote className="text-gray-600 dark:text-gray-400 italic">"{note.content}"</blockquote>
                                            <div className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400">
                                                <svg
                                                    className="w-4 h-4 mr-1 text-gray-400 dark:text-gray-300"
                                                    fill="currentColor"
                                                    viewBox="0 0 24 24"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm11-4a1 1 0 1 0-2 0v4a1 1 0 0 0 .293.707l3 3a1 1 0 0 0 1.414-1.414L13 11.586V8Z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                                Added on {dayjs(note.createdDateTime).format('DD MMM YYYY, HH:mm')}
                                            </div>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ol>
                    </section>
                ))}
            </div>
        </div>
    );
}
