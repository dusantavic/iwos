import { useEffect, useState } from "react";
import { defaultProfile } from "../assets";
import ImageCropperModal from "../ImageCropperModal";
import api from "../utils/axiosInstance";

export default function EmployeeProfileCard({
  employeeId,
  name,
  position,
  imgSrc,
}) {
  const [profileImage, setProfileImage] = useState(imgSrc);

  //Cropper
  const [rawImage, setRawImage] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

  const handleProfileImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setRawImage(url);
      setIsCropping(true);

      //With this, user is able to add same picture and crop it differently
      e.target.value = "";
    }
  };

  async function uploadProfileImage(croppedUrl, employeeId) {
    try {
      const img = await fetch(croppedUrl);
      const blob = await img.blob();

      const formData = new FormData();
      formData.append("file", blob, "profile.jpg");
      formData.append("employeeId", employeeId);

      await api.post("/Employee/UploadProfileImage", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    } catch (error) {
      console.log("Error while uploading a photo", error);
    }
  }

  const handleCropComplete = (croppedUrl) => {
    setProfileImage(croppedUrl);
    setIsCropping(false);

    uploadProfileImage(croppedUrl, employeeId);
  };

  const handleProfileImageRemove = (e) => {
    setProfileImage(null);
    setRawImage(null);
  };

  useEffect(() => {
    const fetchProfileImage = async () => {
      try {
        const image = await api.get(
          `/Employee/GetProfileImage?employeeId=${employeeId}`,
          {
            responseType: "blob",
          }
        );

        const imageBlob = image.data;
        const imageObjectURL = URL.createObjectURL(imageBlob);
        setProfileImage(imageObjectURL);
      } catch (error) {
        console.log("Error while fetching employee's profile picture", error);
      }
    };

    fetchProfileImage();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 dark:border-gray-700 dark:border rounded-lg shadow p-6">
      <div className="border-b border-gray-200 dark:border-gray-700 flex items-center gap-5 relative py-6">
        <img
          src={profileImage ?? defaultProfile}
          alt="User"
          className="w-32 h-32 rounded-full object-cover"
        />

        <div>
          <h2 className="text-[1.8rem] font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            {name}
          </h2>
          <p className="text-gray-500 dark:text-gray-300 flex items-center gap-1 mt-1">
            <svg
              className="mt-[2px] w-[16px] h-[16px] text-gray-500 dark:text-white"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4Zm10 5a1 1 0 0 1 1-1h3a1 1 0 1 1 0 2h-3a1 1 0 0 1-1-1Zm0 3a1 1 0 0 1 1-1h3a1 1 0 1 1 0 2h-3a1 1 0 0 1-1-1Zm0 3a1 1 0 0 1 1-1h3a1 1 0 1 1 0 2h-3a1 1 0 0 1-1-1Zm-8-5a3 3 0 1 1 6 0 3 3 0 0 1-6 0Zm1.942 4a3 3 0 0 0-2.847 2.051l-.044.133-.004.012c-.042.126-.055.167-.042.195.006.013.02.023.038.039.032.025.08.064.146.155A1 1 0 0 0 6 17h6a1 1 0 0 0 .811-.415.713.713 0 0 1 .146-.155c.019-.016.031-.026.038-.04.014-.027 0-.068-.042-.194l-.004-.012-.044-.133A3 3 0 0 0 10.059 14H7.942Z"
                clipRule="evenodd"
              />
            </svg>
            {position}
          </p>
        </div>
      </div>

      <div className="flex gap-1">
        <label
          htmlFor="profileUpload"
          className="cursor-pointer mt-3 inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800"
        >
          <svg
            className="mr-1 w-[16px] h-[16px] text-white dark:text-white"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              fillRule="evenodd"
              d="M12 3a1 1 0 0 1 .78.375l4 5a1 1 0 1 1-1.56 1.25L13 6.85V14a1 1 0 1 1-2 0V6.85L8.78 9.626a1 1 0 1 1-1.56-1.25l4-5A1 1 0 0 1 12 3ZM9 14v-1H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-4v1a3 3 0 1 1-6 0Zm8 2a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2H17Z"
              clipRule="evenodd"
            />
          </svg>
          Upload new
        </label>
        {/* Hidden file input for button */}
        <input
          id="profileUpload"
          type="file"
          accept="image/*"
          onChange={handleProfileImageUpload}
          className="hidden"
        />
        {/* Cropper modal */}
        {isCropping && rawImage && (
          <ImageCropperModal
            imageSrc={rawImage}
            onClose={() => setIsCropping(false)}
            onCropComplete={handleCropComplete}
          />
        )}

        <button
          className="mt-3 inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-gray-500 bg-white hover:bg-gray-100 border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          onClick={handleProfileImageRemove}
        >
          Remove photo
        </button>
      </div>
    </div>
  );
}
