import { useEffect, useState } from "react";
import { FiUpload } from "react-icons/fi";
import ImageCropperModal from "../ImageCropperModal";
import { Link, useNavigate } from "react-router-dom";
import Select from "react-select";
import api from "../utils/axiosInstance";
import AsyncSelect from "react-select/async";
import { toast } from "react-toastify";
import AbsenceManagerCard from "../AbsenceManagerCard";
import EmployeeCredentialsModal from "../EmployeeCredentialsModal";
import { Info, Repeat } from "lucide-react";

const inputFieldClassName =
  "mt-1 w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500";

const inputErrorClassName =
  "mt-1 w-full px-3 py-2 text-sm text-gray-900 bg-white border border-red-400 rounded-md focus:outline-none focus:ring-1 focus:ring-red-400 focus:border-red-400";

const loadDepartments = async () => {
  const res = await api.get("/Department/GetDepartmentsForSelect");
  return res.data;
};

const loadPositionsByDepartment = async (departmentId) => {
  const res = await api.get(
    `/Department/GetPositionsForSelectByDepartment?departmentId=${departmentId}`
  );
  return res.data;
};

export default function AddEmployee() {
  const [carriedOverDays, setCarriedOverDays] = useState(0);
  const [annualVacation, setAnnualVacation] = useState(0);
  const [credentials, setCredentials] = useState(null);
  const [errors, setErrors] = useState({});
  const [rotationPatterns, setRotationPatterns] = useState([]);
  const [globalPattern, setGlobalPattern] = useState(null);
  const [enumLookups, setEnumLookups] = useState(null);
  const [department, setDepartment] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [rawImage, setRawImage] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

  const navigate = useNavigate();

  const [newEmployee, setNewEmployee] = useState({
    contactEmail: "",
    firstName: "",
    lastName: "",
    personalId: "",
    country: "",
    contractType: "",
    birthDate: "",
    positionId: "",
    weeklyHours: 40,
    weeklyDays: 5,
    rotationPatternId: null,
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setNewEmployee((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleSelectChange = (selectedOption, { name }) => {
    setNewEmployee((prev) => ({
      ...prev,
      [name]: selectedOption?.value?.toString() ?? "",
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const loadPositions = async () => {
    if (!department) return [];
    return loadPositionsByDepartment(department.value);
  };

  const loadEnumLookups = async () => {
    const res = await api.get("/Employee/GetEnumLookups");
    setEnumLookups(res.data);
    setAnnualVacation(res.data.annualVacationDays);
  };

  const handleProfileImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRawImage(URL.createObjectURL(file));
      setIsCropping(true);
    }
  };

  const handleCropComplete = (croppedUrl) => {
    setProfileImage(croppedUrl);
    setIsCropping(false);
  };

  function validate() {
    const newErrors = {};
    if (!newEmployee.firstName?.trim()) newErrors.firstName = "First name is required.";
    if (!newEmployee.lastName?.trim()) newErrors.lastName = "Last name is required.";
    if (!department) newErrors.department = "Department is required.";
    if (!newEmployee.positionId) newErrors.positionId = "Position is required.";
    if (!newEmployee.weeklyHours || Number(newEmployee.weeklyHours) < 1) newErrors.weeklyHours = "Weekly hours must be at least 1.";
    const wd = Number(newEmployee.weeklyDays);
    if (!wd || wd < 1 || wd > 7) newErrors.weeklyDays = "Working days per week must be between 1 and 7.";
    return newErrors;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstErrorKey = Object.keys(validationErrors)[0];
      document.querySelector(`[data-field="${firstErrorKey}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    try {
      const payload = {
        ...newEmployee,
        contactEmail: newEmployee.contactEmail || null,
        personalId: newEmployee.personalId || null,
        country: newEmployee.country || null,
        contractType: newEmployee.contractType ? Number(newEmployee.contractType) : null,
        birthDate: newEmployee.birthDate || null,
        annualVacationDays: annualVacation,
        carriedOverVacationDays: carriedOverDays,
      };

      const postPromise = api.post("/Employee/AddEmployee", payload);
      const response = await toast.promise(postPromise, {
        pending: "Adding a new employee...",
        success: "New employee added",
        error: "Error while trying to add new employee",
      });

      const resultId = response.data.id;
      const issuedCredentials = response.data.credentials;

      if (profileImage) uploadProfileImage(profileImage, resultId);

      if (issuedCredentials) {
        setCredentials(issuedCredentials);
      } else {
        navigate("/employees");
      }
    } catch (error) {
      console.log(error);
    }
  }

  async function uploadProfileImage(croppedUrl, employeeId) {
    try {
      const img = await fetch(croppedUrl);
      const blob = await img.blob();
      const formData = new FormData();
      formData.append("file", blob, "profile.jpg");
      formData.append("employeeId", employeeId);
      await api.post("/Employee/UploadProfileImage", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } catch (error) {
      console.log("Error while uploading a photo", error);
    }
  }

  useEffect(() => {
    loadEnumLookups();
    api.get("/Shift/GetRotationPatterns").then(({ data }) => {
      setRotationPatterns(data ?? []);
      const global = data?.find((p) => p.isGlobal);
      if (global) {
        setGlobalPattern(global);
        setNewEmployee((prev) => ({ ...prev, rotationPatternId: global.id }));
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen">
      <div className="space-y-3">
        <div className="flex flex-col items-start gap-2 mb-6">
          <Link
            to="/employees"
            className="inline-flex items-center text-sm text-blue-600 hover:underline"
          >
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L8.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Employees Overview
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Employee Registration
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Fill out the form below to register a new employee.
          </p>
        </div>

        {/* Profile photo + basic info row */}
        <div className="flex gap-3">
          <div className="w-md mx-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6 text-center">
            <div className="flex flex-col items-center h-full justify-center space-y-4">
              <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-gray-300 dark:border-gray-600">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center w-full h-full bg-gray-100 dark:bg-gray-700">
                    <FiUpload className="text-gray-400 w-8 h-8" />
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleProfileImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" aria-label="Upload profile image" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Upload Profile Photo</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Accepts JPEG / JPG or PNG</p>
              </div>
              <div className="flex gap-3 mt-2">
                <label htmlFor="profileUpload" className="px-4 py-2 text-sm font-medium bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition cursor-pointer">
                  Choose File
                </label>
                <button type="button" onClick={() => setProfileImage(null)} className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition cursor-pointer">
                  Remove
                </button>
              </div>
              <input id="profileUpload" type="file" accept="image/*" onChange={handleProfileImageUpload} className="hidden" />
              {isCropping && rawImage && (
                <ImageCropperModal imageSrc={rawImage} onClose={() => setIsCropping(false)} onCropComplete={handleCropComplete} />
              )}
            </div>
          </div>

          <div className="flex-1 bg-white rounded-lg shadow p-6 relative dark:bg-gray-800 dark:border-gray-700 dark:border">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase mb-4 tracking-wide">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 border-t border-gray-200 py-4 dark:border-gray-700">
              <dl data-field="firstName">
                <dt className="font-semibold text-gray-900 dark:text-white">First Name <span className="text-red-500">*</span></dt>
                <dd>
                  <input type="text" className={errors.firstName ? inputErrorClassName : inputFieldClassName} placeholder="Enter first name" name="firstName" onChange={handleChange} />
                </dd>
                {errors.firstName && <dd className="mt-1 text-xs text-red-500">{errors.firstName}</dd>}
              </dl>

              <dl data-field="lastName">
                <dt className="font-semibold text-gray-900 dark:text-white">Last Name <span className="text-red-500">*</span></dt>
                <dd>
                  <input type="text" className={errors.lastName ? inputErrorClassName : inputFieldClassName} placeholder="Enter last name" name="lastName" onChange={handleChange} />
                </dd>
                {errors.lastName && <dd className="mt-1 text-xs text-red-500">{errors.lastName}</dd>}
              </dl>

              <dl>
                <dt className="font-semibold text-gray-900 dark:text-white">
                  Country <span className="text-gray-400 font-normal text-xs">(optional)</span>
                </dt>
                <input
                  type="text"
                  className={inputFieldClassName}
                  placeholder="Enter country"
                  name="country"
                  onChange={handleChange}
                />
              </dl>

              <dl data-field="department">
                <dt className="font-semibold text-gray-900 dark:text-white">Department <span className="text-red-500">*</span></dt>
                <AsyncSelect
                  cacheOptions
                  defaultOptions={true}
                  loadOptions={loadDepartments}
                  placeholder="Select department"
                  className="mt-1"
                  onChange={(value) => {
                    setDepartment(value);
                    if (errors.department) setErrors((prev) => ({ ...prev, department: null }));
                  }}
                  styles={errors.department ? { control: (base) => ({ ...base, borderColor: "#f87171", "&:hover": { borderColor: "#f87171" } }) } : undefined}
                />
                {errors.department && <dd className="mt-1 text-xs text-red-500">{errors.department}</dd>}
              </dl>

              <dl data-field="positionId">
                <dt className="font-semibold text-gray-900 dark:text-white">Position <span className="text-red-500">*</span></dt>
                <AsyncSelect
                  name="positionId"
                  key={department?.value}
                  cacheOptions
                  defaultOptions
                  loadOptions={loadPositions}
                  isDisabled={!department}
                  placeholder={department ? "Select position" : "Select department first"}
                  className="mt-1"
                  onChange={handleSelectChange}
                  styles={errors.positionId ? { control: (base) => ({ ...base, borderColor: "#f87171", "&:hover": { borderColor: "#f87171" } }) } : undefined}
                />
                {errors.positionId && <dd className="mt-1 text-xs text-red-500">{errors.positionId}</dd>}
              </dl>
            </div>
          </div>
        </div>

        {/* Additional data */}
        <div className="bg-white rounded-lg shadow p-6 relative dark:bg-gray-800 dark:border-gray-700 dark:border">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase mb-4 tracking-wide">
            Additional Data
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 border-t border-gray-200 py-4 dark:border-gray-700">
            <dl>
              <dt className="font-semibold text-gray-900 dark:text-white">
                Email <span className="text-gray-400 font-normal text-xs">(optional)</span>
              </dt>
              <dd>
                <input
                  type="email"
                  className={inputFieldClassName}
                  placeholder="Enter email"
                  name="contactEmail"
                  onChange={handleChange}
                />
              </dd>
              <dd className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                <Info className="w-3 h-3 shrink-0" />
                Employee will not receive any notifications without an email.
              </dd>
            </dl>

            <dl>
              <dt className="font-semibold text-gray-900 dark:text-white">
                Personal ID <span className="text-gray-400 font-normal text-xs">(optional)</span>
              </dt>
              <dd>
                <input
                  type="text"
                  className={inputFieldClassName}
                  placeholder="Enter personal ID"
                  name="personalId"
                  onChange={handleChange}
                />
              </dd>
            </dl>

            <dl>
              <dt className="font-semibold text-gray-900 dark:text-white">
                Birth Date <span className="text-gray-400 font-normal text-xs">(optional)</span>
              </dt>
              <dd>
                <input
                  type="date"
                  className={inputFieldClassName}
                  name="birthDate"
                  onChange={handleChange}
                />
              </dd>
            </dl>

            <dl>
              <dt className="font-semibold text-gray-900 dark:text-white">
                Contract Type <span className="text-gray-400 font-normal text-xs">(optional)</span>
              </dt>
              <Select
                name="contractType"
                options={enumLookups?.contractTypeSelectItems}
                placeholder="Select contract type"
                isClearable
                className="mt-1"
                onChange={handleSelectChange}
              />
            </dl>
          </div>
        </div>

        {/* Scheduling */}
        <div className="bg-white rounded-lg shadow p-6 relative dark:bg-gray-800 dark:border-gray-700 dark:border">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase mb-4 tracking-wide">
            Scheduling
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 border-t border-gray-200 py-4 dark:border-gray-700">
            <dl data-field="weeklyHours">
              <dt className="font-semibold text-gray-900 dark:text-white">Weekly Hours <span className="text-red-500">*</span></dt>
              <dd>
                <input
                  type="number"
                  min="1"
                  max="80"
                  className={errors.weeklyHours ? inputErrorClassName : inputFieldClassName}
                  value={newEmployee.weeklyHours}
                  name="weeklyHours"
                  onChange={handleChange}
                />
              </dd>
              {errors.weeklyHours
                ? <dd className="mt-1 text-xs text-red-500">{errors.weeklyHours}</dd>
                : <dd className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                    <Info className="w-3 h-3 shrink-0" />
                    Defaults to 40h if left unchanged.
                  </dd>
              }
            </dl>

            <dl data-field="weeklyDays">
              <dt className="font-semibold text-gray-900 dark:text-white">Working Days / Week <span className="text-red-500">*</span></dt>
              <dd>
                <input
                  type="number"
                  min="1"
                  max="7"
                  className={errors.weeklyDays ? inputErrorClassName : inputFieldClassName}
                  value={newEmployee.weeklyDays}
                  name="weeklyDays"
                  onChange={handleChange}
                />
              </dd>
              {errors.weeklyDays
                ? <dd className="mt-1 text-xs text-red-500">{errors.weeklyDays}</dd>
                : <dd className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                    <Info className="w-3 h-3 shrink-0" />
                    Used to approximate vacation days when a request is submitted before the schedule is generated. Default 5.
                  </dd>
              }
            </dl>

            <dl>
              <dt className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-gray-400" />
                Rotation Pattern
                {globalPattern && (
                  <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 ml-1">
                    Default
                  </span>
                )}
              </dt>
              <dd className="mt-1">
                {globalPattern ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700">
                    <Repeat className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-medium">{globalPattern.name}</span>
                    <span className="text-blue-500 text-xs">— {globalPattern.daysOn} on / {globalPattern.daysOff} off</span>
                    <span className="ml-auto text-xs text-blue-400">Auto-assigned</span>
                  </div>
                ) : (
                  <Select
                    options={rotationPatterns.map((p) => ({
                      value: p.id,
                      label: `${p.name} (${p.daysOn} on / ${p.daysOff} off)`,
                    }))}
                    isClearable
                    placeholder="No rotation pattern"
                    onChange={(opt) =>
                      setNewEmployee((prev) => ({ ...prev, rotationPatternId: opt?.value ?? null }))
                    }
                  />
                )}
              </dd>
            </dl>
          </div>
        </div>

        <AbsenceManagerCard
          totalAnnualVacationDays={enumLookups?.annualVacationDays}
          annualVacation={annualVacation}
          carriedOverDays={carriedOverDays}
          setAnnualVacation={setAnnualVacation}
          setCarriedOverDays={setCarriedOverDays}
        />

        <div className="border-t border-gray-200 dark:border-gray-600 mt-6 pt-4 text-right">
          <button
            onClick={handleSubmit}
            className="inline-flex items-center justify-center cursor-pointer rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          >
            Submit & Finish
          </button>
        </div>
      </div>

      {credentials && (
        <EmployeeCredentialsModal
          credentials={credentials}
          onClose={() => {
            setCredentials(null);
            navigate("/employees");
          }}
        />
      )}
    </div>
  );
}
