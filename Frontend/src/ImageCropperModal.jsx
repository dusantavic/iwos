import { useCallback, useState } from "react";
import { getCroppedImg } from "./utils/cropImage";
import Cropper from "react-easy-crop";

export default function ImageCropperModal({ imageSrc, onClose, onCropComplete }) { 
    const [crop, setCrop] = useState({ x: 0, y: 0}); 
    const [zoom, setZoom] = useState(1); 
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null); 

    const onCropAreaComplete = useCallback((_, croppedAreaPixels) => { 
        setCroppedAreaPixels(croppedAreaPixels); 
    }, []); 

    const handleDone = async () => { 
        const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, zoom); 
        onCropComplete(croppedImage); 
    }; 

    return ( 
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white p-6 pb-5 rounded-lg w-full max-w-md shadow-lg">
          <div className="relative w-full h-64 bg-gray-100 rounded">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropAreaComplete}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-1.5 text-sm bg-gray-200 dark:text-gray-800 hover:bg-gray-300 cursor-pointer rounded-lg">Cancel</button>
            <button onClick={handleDone} className="px-4 py-1.5 text-sm bg-blue-700 hover:bg-blue-800 cursor-pointer text-white rounded-lg">Crop & Finish</button>
          </div>
        </div>
      </div>
    ); 
}