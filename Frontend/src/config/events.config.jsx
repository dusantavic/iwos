import { GiPalmTree } from "react-icons/gi";
import { MdCake, MdWorkspacePremium } from "react-icons/md";
import { RiShieldCheckFill } from "react-icons/ri";
import { FaPills } from "react-icons/fa";

// @dusan: use typeCode, not string
export const EVENT_COLORS = {
  Vacation: "bg-blue-700",
  "Sick Leave": "bg-red-500",
  Birthday: "bg-yellow-500",
  "Employment Anniversary": "bg-green-500",
  "Justified Absence": "bg-orange-400",
};

// @dusan: use typeCode, not string
export const EVENT_ICONS = {
  // Vacation: <IoAirplane className="w-3.5 h-3.5" />,
  Vacation: <GiPalmTree className="w-3.5 h-3.5" />,
  "Sick Leave": <FaPills className="w-3.5 h-3.5" />,
  Birthday: <MdCake className="w-3.5 h-3.5" />,
  "Employment Anniversary": <MdWorkspacePremium className="w-3.5 h-3.5" />,
  "Justified Absence": <RiShieldCheckFill className="w-3.5 h-3.5" />,
};
