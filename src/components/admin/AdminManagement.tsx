import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UsersIcon, UserPlusIcon, EditIcon, TrashIcon, CrownIcon, GraduationCapIcon, BookOpenIcon, SearchIcon, Loader2, XIcon, EyeIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api-config";
import { cn } from "@/lib/utils";

/** Visible borders/background on white dialogs (muted/40 was nearly invisible). */
const SCHOOL_FORM_FIELD_CLASS =
  "border border-slate-300 bg-slate-100 text-slate-900 shadow-sm placeholder:text-slate-500 focus-visible:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-400/30";

interface SchoolDetailsForm {
  doorNo: string;
  street: string;
  area: string;
  city: string;
  district: string;
  /** May be present on API payloads; the form also keeps state on the parent object for selects. */
  state?: string;
  medium: string;
  classesFrom: string;
  classesTo: string;
  totalStrength: string;
  schoolType: string;
}

interface Admin {
  id: string;
  name: string;
  email: string;
  board?: string;
  state?: string;
  place?: string;
  schoolName?: string;
  schoolLogo?: string;
  phone?: string;
  pin?: string;
  contactPerson?: string;
  schoolDetails?: SchoolDetailsForm;
  permissions: string[];
  status: string;
  joinDate: string;
  stats: {
    students: number;
    teachers: number;
    videos: number;
    assessments: number;
    exams: number;
    totalExamsTaken: number;
    averageScore: string;
    averageAccuracy: string;
  };
  analytics: {
    topStudents: Array<{
      studentName: string;
      studentEmail: string;
      totalExams: number;
      averageScore: string;
    }>;
    recentResults: Array<{
      examTitle: string;
      studentName: string;
      score: number;
      marks: string;
      completedAt: string;
    }>;
    subjectPerformance: Array<{
      subject: string;
      accuracy: string;
      averageScore: string;
      totalQuestions: number;
      correctAnswers: number;
    }>;
  };
}

const resolveLogoUrl = (logoUrl?: string): string => {
  if (!logoUrl) return "";
  if (/^https?:\/\//i.test(logoUrl)) return logoUrl;
  return `${API_BASE_URL}${logoUrl.startsWith("/") ? logoUrl : `/${logoUrl}`}`;
};

export default function AdminManagement() {
  const [, setLocation] = useLocation();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [isUpdatingAdmin, setIsUpdatingAdmin] = useState(false);
  const [isDeletingAdmin, setIsDeletingAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const isMutationBusy = isAddingAdmin || isUpdatingAdmin || isDeletingAdmin;
  const DEFAULT_BOARD = 'ASLI_EXCLUSIVE_SCHOOLS';

  const emptySchoolDetails = (): SchoolDetailsForm => ({
    doorNo: '',
    street: '',
    area: '',
    city: '',
    district: '',
    medium: '',
    classesFrom: '6',
    classesTo: '10',
    totalStrength: '',
    schoolType: ''
  });

  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    password: '',
    board: DEFAULT_BOARD,
    state: '',
    schoolName: '',
    schoolLogo: '',
    phone: '',
    pin: '',
    contactPerson: '',
    schoolDetails: emptySchoolDetails()
  });
  const [editAdmin, setEditAdmin] = useState({
    name: '',
    email: '',
    board: DEFAULT_BOARD,
    state: '',
    schoolName: '',
    schoolLogo: '',
    phone: '',
    pin: '',
    contactPerson: '',
    schoolDetails: emptySchoolDetails(),
    isActive: true
  });
  const [isUploadingAddLogo, setIsUploadingAddLogo] = useState(false);
  const [isUploadingEditLogo, setIsUploadingEditLogo] = useState(false);
  const mapAdminState = (admin: any): Admin => {
    const sd = admin?.schoolDetails || {};
    return {
      ...admin,
      state: admin?.state || sd?.state || admin?.place || '',
      schoolDetails: {
        doorNo: sd.doorNo || '',
        street: sd.street || '',
        area: sd.area || '',
        city: sd.city || '',
        district: sd.district || '',
        medium: sd.medium || '',
        classesFrom: sd.classesFrom || '6',
        classesTo: sd.classesTo || '10',
        totalStrength: sd.totalStrength || '',
        schoolType: sd.schoolType || ''
      }
    };
  };

  // Board options (codes must match backend VALID_SCHOOL_BOARDS)
  const boardOptions = [
    { value: 'ASLI_EXCLUSIVE_SCHOOLS', label: 'ASLI Exclusive Schools' },
    { value: 'CBSE', label: 'CBSE' },
    { value: 'STATE', label: 'State Board' },
  ];

  const normalizeAdminBoard = (b?: string): string => {
    const code = (b || '').toUpperCase();
    return boardOptions.some((o) => o.value === code) ? code : DEFAULT_BOARD;
  };

  const mediumOptions = [
    { value: 'English', label: 'English' },
    { value: 'Hindi', label: 'Hindi' },
    { value: 'Telugu', label: 'Telugu' },
    { value: 'Tamil', label: 'Tamil' },
    { value: 'Kannada', label: 'Kannada' },
    { value: 'Malayalam', label: 'Malayalam' },
    { value: 'Marathi', label: 'Marathi' },
    { value: 'Gujarati', label: 'Gujarati' },
    { value: 'Bengali', label: 'Bengali' },
    { value: 'Urdu', label: 'Urdu' },
    { value: 'Other', label: 'Other' }
  ];

  const schoolTypeOptions = [
    { value: 'Government', label: 'Government' },
    { value: 'Private', label: 'Private' },
    { value: 'Aided', label: 'Aided' },
    { value: 'International', label: 'International' },
    { value: 'Other', label: 'Other' }
  ];

  // Indian states/UT labels with short codes
  const stateOptions = [
    { value: 'Andhra Pradesh', label: 'Andhra Pradesh (AP)' },
    { value: 'Arunachal Pradesh', label: 'Arunachal Pradesh (AR)' },
    { value: 'Assam', label: 'Assam (AS)' },
    { value: 'Bihar', label: 'Bihar (BR)' },
    { value: 'Chhattisgarh', label: 'Chhattisgarh (CG)' },
    { value: 'Goa', label: 'Goa (GA)' },
    { value: 'Gujarat', label: 'Gujarat (GJ)' },
    { value: 'Haryana', label: 'Haryana (HR)' },
    { value: 'Himachal Pradesh', label: 'Himachal Pradesh (HP)' },
    { value: 'Jharkhand', label: 'Jharkhand (JH)' },
    { value: 'Karnataka', label: 'Karnataka (KA)' },
    { value: 'Kerala', label: 'Kerala (KL)' },
    { value: 'Madhya Pradesh', label: 'Madhya Pradesh (MP)' },
    { value: 'Maharashtra', label: 'Maharashtra (MH)' },
    { value: 'Manipur', label: 'Manipur (MN)' },
    { value: 'Meghalaya', label: 'Meghalaya (ML)' },
    { value: 'Mizoram', label: 'Mizoram (MZ)' },
    { value: 'Nagaland', label: 'Nagaland (NL)' },
    { value: 'Odisha', label: 'Odisha (OD)' },
    { value: 'Punjab', label: 'Punjab (PB)' },
    { value: 'Rajasthan', label: 'Rajasthan (RJ)' },
    { value: 'Sikkim', label: 'Sikkim (SK)' },
    { value: 'Tamil Nadu', label: 'Tamil Nadu (TN)' },
    { value: 'Telangana', label: 'Telangana (TS)' },
    { value: 'Tripura', label: 'Tripura (TR)' },
    { value: 'Uttar Pradesh', label: 'Uttar Pradesh (UP)' },
    { value: 'Uttarakhand', label: 'Uttarakhand (UK)' },
    { value: 'West Bengal', label: 'West Bengal (WB)' },
    { value: 'Andaman and Nicobar Islands', label: 'Andaman and Nicobar Islands (AN)' },
    { value: 'Chandigarh', label: 'Chandigarh (CH)' },
    { value: 'Dadra and Nagar Haveli and Daman and Diu', label: 'Dadra and Nagar Haveli and Daman and Diu (DN)' },
    { value: 'Delhi', label: 'Delhi (DL)' },
    { value: 'Jammu and Kashmir', label: 'Jammu and Kashmir (JK)' },
    { value: 'Ladakh', label: 'Ladakh (LA)' },
    { value: 'Lakshadweep', label: 'Lakshadweep (LD)' },
    { value: 'Puducherry', label: 'Puducherry (PY)' }
  ];
  const stateCodeToName = stateOptions.reduce<Record<string, string>>((acc, option) => {
    const codeMatch = option.label.match(/\(([A-Z]{2})\)$/);
    if (codeMatch) {
      acc[codeMatch[1]] = option.value;
    }
    return acc;
  }, {});
  const { toast } = useToast();

  const normalizeStateValue = (state?: string): string => {
    if (!state) return '';
    const normalizedState = state.trim();
    if (!normalizedState) return '';

    const exactMatch = stateOptions.find(
      (option) => option.value.toLowerCase() === normalizedState.toLowerCase()
    );
    if (exactMatch) {
      return exactMatch.value;
    }

    const mappedByCode = stateCodeToName[normalizedState.toUpperCase()];
    if (mappedByCode) {
      return mappedByCode;
    }

    const labelMatch = stateOptions.find((option) =>
      option.label.toLowerCase().includes(normalizedState.toLowerCase())
    );
    return labelMatch?.value || '';
  };

  const uploadSchoolLogo = async (file: File): Promise<string | null> => {
    const token = localStorage.getItem('authToken');
    const formData = new FormData();
    formData.append('logo', file);

    const response = await fetch(`${API_BASE_URL}/api/super-admin/admins/upload-logo`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData
    });

    const result = await response.json();
    if (!response.ok || !result?.success || !result?.logoUrl) {
      throw new Error(result?.message || 'Failed to upload school logo');
    }

    return result.logoUrl;
  };

  // Fetch admins from API
  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/api/super-admin/admins`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Fetched admins data:', data);
          
          // Handle both wrapped and direct array responses
          if (Array.isArray(data)) {
            setAdmins(data.map(mapAdminState));
          } else if (data.data && Array.isArray(data.data)) {
            setAdmins(data.data.map(mapAdminState));
          } else {
            console.log('No valid admin data found');
            setAdmins([]);
          }
        } else {
          console.error('API failed with status:', response.status);
          setAdmins([]);
        }
      } catch (error) {
        console.error('Error fetching admins:', error);
        setAdmins([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdmins();
  }, []);

  const handleAddAdmin = async () => {
    if (isAddingAdmin) return; // Prevent multiple submissions
    
    const sd = newAdmin.schoolDetails;
    if (
      !newAdmin.name ||
      !newAdmin.email ||
      !newAdmin.password ||
      !newAdmin.board ||
      !newAdmin.state ||
      !newAdmin.schoolName ||
      !sd.city?.trim() ||
      !sd.district?.trim()
    ) {
      toast({
        title: "Error",
        description:
          "Please fill in administrator name, email, password, board, state, school name, city, and district",
        variant: "destructive",
      });
      return;
    }

    // Check if admin with this email already exists
    const existingAdmin = admins?.find(admin => 
      admin?.email?.toLowerCase() === newAdmin.email.toLowerCase()
    );
    
    if (existingAdmin) {
      toast({
        title: "Admin Already Exists",
        description: "A school with this email already exists. Please use a different email.",
        variant: "destructive",
      });
      return;
    }

    setIsAddingAdmin(true);
    try {
      const token = localStorage.getItem('authToken');
      
      // Prepare payload - backend expects: name, email, board, state, schoolName, permissions
      // Note: Backend sets default password 'admin123', so we don't send password
      const payload = {
        name: newAdmin.name,
        email: newAdmin.email,
        board: newAdmin.board,
        state: newAdmin.state,
        place: newAdmin.state,
        schoolName: newAdmin.schoolName,
        schoolLogo: newAdmin.schoolLogo,
        contactPerson: newAdmin.contactPerson?.trim() || '',
        phone: newAdmin.phone?.trim() || '',
        pin: newAdmin.pin?.trim() || '',
        permissions: [],
        schoolDetails: {
          ...sd,
          state: newAdmin.state
        }
      };
      
      console.log('Creating admin with payload:', payload);
      console.log('API URL:', `${API_BASE_URL}/api/super-admin/admins`);
      
      const response = await fetch(`${API_BASE_URL}/api/super-admin/admins`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const fetchResponse = await fetch(`${API_BASE_URL}/api/super-admin/admins`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (fetchResponse.ok) {
          const fetchData = await fetchResponse.json();
          if (Array.isArray(fetchData)) {
            setAdmins(fetchData.map(mapAdminState));
          } else if (fetchData.data && Array.isArray(fetchData.data)) {
            setAdmins(fetchData.data.map(mapAdminState));
          }
        }
        setNewAdmin({
          name: '',
          email: '',
          password: '',
          board: DEFAULT_BOARD,
          state: '',
          schoolName: '',
          schoolLogo: '',
          phone: '',
          pin: '',
          contactPerson: '',
          schoolDetails: emptySchoolDetails()
        });
        setIsAddDialogOpen(false);
        toast({
          title: "Success",
          description: "School added successfully",
        });
      } else {
        const errorData = await response.json();
        console.log('API Error Response:', errorData);
        throw new Error(errorData.message || 'Failed to add school');
      }
    } catch (error) {
      console.error('Error adding admin:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to add admin";
      
      // Check for network errors
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ERR_NAME_NOT_RESOLVED')) {
        toast({
          title: "Network Error",
          description: "Cannot connect to the server. Please check your internet connection and ensure the backend is running.",
          variant: "destructive",
        });
      } else if (errorMessage.includes('already exists')) {
        toast({
          title: "Admin Already Exists",
          description: "A school with this email already exists. Please use a different email.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage || "Failed to add school. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const handleEditClick = (admin: Admin) => {
    setEditingAdmin(admin);
    const sd = admin.schoolDetails || emptySchoolDetails();
    setEditAdmin({
      name: admin.name || '',
      email: admin.email || '',
      board: normalizeAdminBoard(admin.board),
      state: normalizeStateValue(admin.state || admin.place || sd.state),
      schoolName: admin.schoolName || '',
      schoolLogo: admin.schoolLogo || '',
      phone: admin.phone || '',
      pin: admin.pin || '',
      contactPerson: admin.contactPerson || '',
      schoolDetails: { ...emptySchoolDetails(), ...sd },
      isActive: admin.status === 'active' || admin.status === 'Active'
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateAdmin = async () => {
    if (isUpdatingAdmin) return;

    if (!editingAdmin?.id) {
      toast({
        title: "Error",
        description: "Invalid school ID",
        variant: "destructive",
      });
      return;
    }

    const esd = editAdmin.schoolDetails;
    if (
      !editAdmin.name ||
      !editAdmin.email ||
      !editAdmin.board ||
      !editAdmin.state ||
      !editAdmin.schoolName ||
      !esd.city?.trim() ||
      !esd.district?.trim()
    ) {
      toast({
        title: "Error",
        description: "Please fill in all required fields including city and district",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingAdmin(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/super-admin/admins/${editingAdmin.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editAdmin.name,
          email: editAdmin.email,
          board: editAdmin.board,
          state: editAdmin.state,
          place: editAdmin.state,
          schoolName: editAdmin.schoolName,
          schoolLogo: editAdmin.schoolLogo,
          contactPerson: editAdmin.contactPerson?.trim() || '',
          phone: editAdmin.phone?.trim() || '',
          pin: editAdmin.pin?.trim() || '',
          schoolDetails: {
            ...esd,
            state: editAdmin.state
          },
          isActive: editAdmin.isActive
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Update admin success:', result);
        
        // Refresh the admins list
        const fetchResponse = await fetch(`${API_BASE_URL}/api/super-admin/admins`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (fetchResponse.ok) {
          const fetchData = await fetchResponse.json();
          console.log('Refreshed admins data:', fetchData);
          if (Array.isArray(fetchData)) {
            setAdmins(fetchData.map(mapAdminState));
          } else if (fetchData.data && Array.isArray(fetchData.data)) {
            setAdmins(fetchData.data.map(mapAdminState));
          }
        }
        
        setIsEditDialogOpen(false);
        setEditingAdmin(null);
        // Reset edit form
        setEditAdmin({
          name: '',
          email: '',
          board: DEFAULT_BOARD,
          state: '',
          schoolName: '',
          schoolLogo: '',
          phone: '',
          pin: '',
          contactPerson: '',
          schoolDetails: emptySchoolDetails(),
          isActive: true
        });
        toast({
          title: "Success",
          description: "School updated successfully",
        });
      } else {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { message: errorText || `Server error: ${response.status}` };
        }
        console.error('Update admin error response:', errorData);
        throw new Error(errorData.message || 'Failed to update school');
      }
    } catch (error) {
      console.error('Error updating admin:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update school",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingAdmin(false);
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    if (isDeletingAdmin) return;

    if (!adminId) {
      toast({
        title: "Error",
        description: "Invalid school ID",
        variant: "destructive",
      });
      return;
    }

    setIsDeletingAdmin(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/super-admin/admins/${adminId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const deleteResult = await response.json();
        
        // Wait a moment to ensure database cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Refresh the admins list from the server to ensure deleted admin is removed
        const fetchResponse = await fetch(`${API_BASE_URL}/api/super-admin/admins`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (fetchResponse.ok) {
          const fetchData = await fetchResponse.json();
          if (Array.isArray(fetchData)) {
            setAdmins(fetchData.map(mapAdminState));
          } else if (fetchData.data && Array.isArray(fetchData.data)) {
            setAdmins(fetchData.data.map(mapAdminState));
          } else {
            // Fallback: filter from local state
            setAdmins((admins || []).filter(admin => admin?.id !== adminId));
          }
        } else {
          // Fallback: filter from local state
          setAdmins((admins || []).filter(admin => admin?.id !== adminId));
        }
        
        toast({
          title: "Success",
          description: "School and all associated data deleted successfully. You can now add a new school with the same email.",
        });
        
        // Dispatch custom event to notify dashboard to refresh admin summary
        window.dispatchEvent(new CustomEvent('adminDeleted'));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete school');
      }
    } catch (error) {
      console.error('Error deleting admin:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete school",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAdmin(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading schools...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">School Management</h2>
          <p className="text-gray-600">Manage schools and their associated data</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <UserPlusIcon className="h-4 w-4 mr-2" />
              Add New School
            </Button>
          </DialogTrigger>
          <DialogContent className="flex h-auto max-h-[94vh] w-[min(96vw,80rem)] max-w-none translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
            <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4 text-left">
              <DialogTitle>Add New School</DialogTitle>
              <DialogDescription>
                Three-column layout on large screens. Choose ASLI Exclusive Schools, CBSE, or State Board.
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-6 py-4">
              <p className="mb-3 text-sm font-semibold text-gray-900">Administrator</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={newAdmin.name}
                    onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                    placeholder="School administrator full name"
                    className={SCHOOL_FORM_FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                    placeholder="Administrator email"
                    className={SCHOOL_FORM_FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    placeholder="Temporary password"
                    className={SCHOOL_FORM_FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contactPerson">Contact person</Label>
                  <Input
                    id="contactPerson"
                    value={newAdmin.contactPerson}
                    onChange={(e) => setNewAdmin({ ...newAdmin, contactPerson: e.target.value })}
                    placeholder="Primary contact name"
                    className={SCHOOL_FORM_FIELD_CLASS}
                  />
                </div>
              </div>

              <p className="mb-3 mt-8 text-sm font-semibold text-gray-900">School Information</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
                  <Label htmlFor="schoolName">School Name *</Label>
                  <Input
                    id="schoolName"
                    value={newAdmin.schoolName}
                    onChange={(e) => setNewAdmin({ ...newAdmin, schoolName: e.target.value })}
                    placeholder="School name"
                    className={SCHOOL_FORM_FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="doorNo">Door No</Label>
                  <Input
                    id="doorNo"
                    value={newAdmin.schoolDetails.doorNo}
                    onChange={(e) =>
                      setNewAdmin({
                        ...newAdmin,
                        schoolDetails: { ...newAdmin.schoolDetails, doorNo: e.target.value }
                      })
                    }
                    placeholder="Door / plot no."
                    className={SCHOOL_FORM_FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="street">Street</Label>
                  <Input
                    id="street"
                    value={newAdmin.schoolDetails.street}
                    onChange={(e) =>
                      setNewAdmin({
                        ...newAdmin,
                        schoolDetails: { ...newAdmin.schoolDetails, street: e.target.value }
                      })
                    }
                    placeholder="Street"
                    className={SCHOOL_FORM_FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="area">Area</Label>
                  <Input
                    id="area"
                    value={newAdmin.schoolDetails.area}
                    onChange={(e) =>
                      setNewAdmin({
                        ...newAdmin,
                        schoolDetails: { ...newAdmin.schoolDetails, area: e.target.value }
                      })
                    }
                    placeholder="Area / locality"
                    className={SCHOOL_FORM_FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={newAdmin.schoolDetails.city}
                    onChange={(e) =>
                      setNewAdmin({
                        ...newAdmin,
                        schoolDetails: { ...newAdmin.schoolDetails, city: e.target.value }
                      })
                    }
                    placeholder="City"
                    className={SCHOOL_FORM_FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="district">District *</Label>
                  <Input
                    id="district"
                    value={newAdmin.schoolDetails.district}
                    onChange={(e) =>
                      setNewAdmin({
                        ...newAdmin,
                        schoolDetails: { ...newAdmin.schoolDetails, district: e.target.value }
                      })
                    }
                    placeholder="District"
                    className={SCHOOL_FORM_FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state">State *</Label>
                  <Select
                    value={newAdmin.state}
                    onValueChange={(value) => setNewAdmin({ ...newAdmin, state: value })}
                  >
                    <SelectTrigger id="state" className={SCHOOL_FORM_FIELD_CLASS}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {stateOptions.map((state) => (
                        <SelectItem key={state.value} value={state.value}>
                          {state.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pin">Pincode</Label>
                  <Input
                    id="pin"
                    value={newAdmin.pin}
                    onChange={(e) => setNewAdmin({ ...newAdmin, pin: e.target.value })}
                    placeholder="Pincode"
                    className={SCHOOL_FORM_FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="board">Board *</Label>
                  <Select
                    value={newAdmin.board}
                    onValueChange={(value) => setNewAdmin({ ...newAdmin, board: value })}
                  >
                    <SelectTrigger id="board" className={SCHOOL_FORM_FIELD_CLASS}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {boardOptions.map((board) => (
                        <SelectItem key={board.value} value={board.value}>
                          {board.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="medium">Medium</Label>
                  <Select
                    value={newAdmin.schoolDetails.medium || undefined}
                    onValueChange={(value) =>
                      setNewAdmin({
                        ...newAdmin,
                        schoolDetails: { ...newAdmin.schoolDetails, medium: value }
                      })
                    }
                  >
                    <SelectTrigger id="medium" className={SCHOOL_FORM_FIELD_CLASS}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {mediumOptions.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="classesFrom">Classes From</Label>
                  <Input
                    id="classesFrom"
                    value={newAdmin.schoolDetails.classesFrom}
                    onChange={(e) =>
                      setNewAdmin({
                        ...newAdmin,
                        schoolDetails: { ...newAdmin.schoolDetails, classesFrom: e.target.value }
                      })
                    }
                    placeholder="e.g. 6"
                    className={SCHOOL_FORM_FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="classesTo">Classes To</Label>
                  <Input
                    id="classesTo"
                    value={newAdmin.schoolDetails.classesTo}
                    onChange={(e) =>
                      setNewAdmin({
                        ...newAdmin,
                        schoolDetails: { ...newAdmin.schoolDetails, classesTo: e.target.value }
                      })
                    }
                    placeholder="e.g. 10"
                    className={SCHOOL_FORM_FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="totalStrength">Total Strength</Label>
                  <Input
                    id="totalStrength"
                    value={newAdmin.schoolDetails.totalStrength}
                    onChange={(e) =>
                      setNewAdmin({
                        ...newAdmin,
                        schoolDetails: { ...newAdmin.schoolDetails, totalStrength: e.target.value }
                      })
                    }
                    placeholder="Approx. student strength"
                    className={SCHOOL_FORM_FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="schoolType">School Type</Label>
                  <Select
                    value={newAdmin.schoolDetails.schoolType || undefined}
                    onValueChange={(value) =>
                      setNewAdmin({
                        ...newAdmin,
                        schoolDetails: { ...newAdmin.schoolDetails, schoolType: value }
                      })
                    }
                  >
                    <SelectTrigger id="schoolType" className={SCHOOL_FORM_FIELD_CLASS}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {schoolTypeOptions.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={newAdmin.phone}
                    onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })}
                    placeholder="School / office phone"
                    className={SCHOOL_FORM_FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
                  <Label htmlFor="schoolLogo">School Logo</Label>
                  <Input
                    id="schoolLogo"
                    type="file"
                    accept="image/*"
                    className={cn(
                      SCHOOL_FORM_FIELD_CLASS,
                      "cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-orange-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-orange-700 hover:file:bg-orange-100"
                    )}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsUploadingAddLogo(true);
                      try {
                        const logoUrl = await uploadSchoolLogo(file);
                        if (logoUrl) {
                          setNewAdmin({ ...newAdmin, schoolLogo: logoUrl });
                        }
                      } catch (error) {
                        toast({
                          title: "Logo upload failed",
                          description: error instanceof Error ? error.message : "Unable to upload school logo",
                          variant: "destructive",
                        });
                      } finally {
                        setIsUploadingAddLogo(false);
                        e.target.value = "";
                      }
                    }}
                  />
                  {isUploadingAddLogo && (
                    <p className="text-xs text-gray-500">Uploading logo...</p>
                  )}
                  {newAdmin.schoolLogo && (
                    <div className="mt-2 flex items-center gap-3 rounded-md border border-slate-300 bg-slate-50 p-2">
                      <img
                        src={resolveLogoUrl(newAdmin.schoolLogo)}
                        alt="School logo preview"
                        className="h-10 w-10 shrink-0 rounded border object-cover"
                      />
                      <p className="min-w-0 flex-1 truncate text-xs text-gray-600">{newAdmin.schoolLogo}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-slate-600 hover:bg-red-50 hover:text-red-600"
                        onClick={() => setNewAdmin({ ...newAdmin, schoolLogo: "" })}
                        aria-label="Remove school logo"
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t px-6 py-4">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddAdmin} disabled={isAddingAdmin}>
                {isAddingAdmin ? "Adding..." : "Add School"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Admin Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="flex h-auto max-h-[94vh] w-[min(96vw,80rem)] max-w-none translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
            <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4 text-left">
              <DialogTitle>Edit School</DialogTitle>
              <DialogDescription>
                Three-column layout on large screens. Choose ASLI Exclusive Schools, CBSE, or State Board.
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-6 py-4">
              <p className="mb-3 text-sm font-semibold text-gray-900">Administrator</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-name">Full Name *</Label>
                  <Input
                    id="edit-name"
                    value={editAdmin.name}
                    onChange={(e) => setEditAdmin({ ...editAdmin, name: e.target.value })}
                    placeholder="School administrator full name"
                    className={SCHOOL_FORM_FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-email">Email *</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editAdmin.email}
                    onChange={(e) => setEditAdmin({ ...editAdmin, email: e.target.value })}
                    placeholder="Administrator email"
                    className={SCHOOL_FORM_FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-contactPerson">Contact person</Label>
                  <Input
                    id="edit-contactPerson"
                    value={editAdmin.contactPerson}
                    onChange={(e) => setEditAdmin({ ...editAdmin, contactPerson: e.target.value })}
                    placeholder="Primary contact name"
                    className={SCHOOL_FORM_FIELD_CLASS}
                  />
                </div>
                <div className="flex items-end space-x-2 pb-2 md:col-span-2 lg:col-span-3">
                  <input
                    type="checkbox"
                    id="edit-isActive"
                    checked={editAdmin.isActive}
                    onChange={(e) => setEditAdmin({ ...editAdmin, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="edit-isActive" className="cursor-pointer">
                    Active Account
                  </Label>
                </div>
              </div>

              <p className="mb-3 mt-8 text-sm font-semibold text-gray-900">School Information</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
                  <Label htmlFor="edit-schoolName">School Name *</Label>
                  <Input
                    id="edit-schoolName"
                    value={editAdmin.schoolName}
                    onChange={(e) => setEditAdmin({ ...editAdmin, schoolName: e.target.value })}
                    placeholder="School name"
                    className={SCHOOL_FORM_FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-doorNo">Door No</Label>
                  <Input
                    id="edit-doorNo"
                    value={editAdmin.schoolDetails.doorNo}
                    onChange={(e) =>
                      setEditAdmin({
                        ...editAdmin,
                        schoolDetails: { ...editAdmin.schoolDetails, doorNo: e.target.value }
                      })
                    }
                    className={SCHOOL_FORM_FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-street">Street</Label>
                  <Input
                    id="edit-street"
                    value={editAdmin.schoolDetails.street}
                    onChange={(e) =>
                      setEditAdmin({
                        ...editAdmin,
                        schoolDetails: { ...editAdmin.schoolDetails, street: e.target.value }
                      })
                    }
                    className={SCHOOL_FORM_FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-area">Area</Label>
                  <Input
                    id="edit-area"
                    value={editAdmin.schoolDetails.area}
                    onChange={(e) =>
                      setEditAdmin({
                        ...editAdmin,
                        schoolDetails: { ...editAdmin.schoolDetails, area: e.target.value }
                      })
                    }
                    className={SCHOOL_FORM_FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-city">City *</Label>
                  <Input
                    id="edit-city"
                    value={editAdmin.schoolDetails.city}
                    onChange={(e) =>
                      setEditAdmin({
                        ...editAdmin,
                        schoolDetails: { ...editAdmin.schoolDetails, city: e.target.value }
                      })
                    }
                    className={SCHOOL_FORM_FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-district">District *</Label>
                  <Input
                    id="edit-district"
                    value={editAdmin.schoolDetails.district}
                    onChange={(e) =>
                      setEditAdmin({
                        ...editAdmin,
                        schoolDetails: { ...editAdmin.schoolDetails, district: e.target.value }
                      })
                    }
                    className={SCHOOL_FORM_FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-state">State *</Label>
                  <Select
                    value={editAdmin.state}
                    onValueChange={(value) => setEditAdmin({ ...editAdmin, state: value })}
                  >
                    <SelectTrigger id="edit-state" className={SCHOOL_FORM_FIELD_CLASS}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {stateOptions.map((state) => (
                        <SelectItem key={state.value} value={state.value}>
                          {state.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-pin">Pincode</Label>
                  <Input
                    id="edit-pin"
                    value={editAdmin.pin}
                    onChange={(e) => setEditAdmin({ ...editAdmin, pin: e.target.value })}
                    className={SCHOOL_FORM_FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-board">Board *</Label>
                  <Select
                    value={editAdmin.board}
                    onValueChange={(value) => setEditAdmin({ ...editAdmin, board: value })}
                  >
                    <SelectTrigger id="edit-board" className={SCHOOL_FORM_FIELD_CLASS}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {boardOptions.map((board) => (
                        <SelectItem key={board.value} value={board.value}>
                          {board.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-medium">Medium</Label>
                  <Select
                    value={editAdmin.schoolDetails.medium || undefined}
                    onValueChange={(value) =>
                      setEditAdmin({
                        ...editAdmin,
                        schoolDetails: { ...editAdmin.schoolDetails, medium: value }
                      })
                    }
                  >
                    <SelectTrigger id="edit-medium" className={SCHOOL_FORM_FIELD_CLASS}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {mediumOptions.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-classesFrom">Classes From</Label>
                  <Input
                    id="edit-classesFrom"
                    value={editAdmin.schoolDetails.classesFrom}
                    onChange={(e) =>
                      setEditAdmin({
                        ...editAdmin,
                        schoolDetails: { ...editAdmin.schoolDetails, classesFrom: e.target.value }
                      })
                    }
                    className={SCHOOL_FORM_FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-classesTo">Classes To</Label>
                  <Input
                    id="edit-classesTo"
                    value={editAdmin.schoolDetails.classesTo}
                    onChange={(e) =>
                      setEditAdmin({
                        ...editAdmin,
                        schoolDetails: { ...editAdmin.schoolDetails, classesTo: e.target.value }
                      })
                    }
                    className={SCHOOL_FORM_FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-totalStrength">Total Strength</Label>
                  <Input
                    id="edit-totalStrength"
                    value={editAdmin.schoolDetails.totalStrength}
                    onChange={(e) =>
                      setEditAdmin({
                        ...editAdmin,
                        schoolDetails: { ...editAdmin.schoolDetails, totalStrength: e.target.value }
                      })
                    }
                    className={SCHOOL_FORM_FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-schoolType">School Type</Label>
                  <Select
                    value={editAdmin.schoolDetails.schoolType || undefined}
                    onValueChange={(value) =>
                      setEditAdmin({
                        ...editAdmin,
                        schoolDetails: { ...editAdmin.schoolDetails, schoolType: value }
                      })
                    }
                  >
                    <SelectTrigger id="edit-schoolType" className={SCHOOL_FORM_FIELD_CLASS}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {schoolTypeOptions.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-phone">Phone Number</Label>
                  <Input
                    id="edit-phone"
                    value={editAdmin.phone}
                    onChange={(e) => setEditAdmin({ ...editAdmin, phone: e.target.value })}
                    className={SCHOOL_FORM_FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
                  <Label htmlFor="edit-schoolLogo">School Logo</Label>
                  <Input
                    id="edit-schoolLogo"
                    type="file"
                    accept="image/*"
                    className={cn(
                      SCHOOL_FORM_FIELD_CLASS,
                      "cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-orange-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-orange-700 hover:file:bg-orange-100"
                    )}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsUploadingEditLogo(true);
                      try {
                        const logoUrl = await uploadSchoolLogo(file);
                        if (logoUrl) {
                          setEditAdmin({ ...editAdmin, schoolLogo: logoUrl });
                        }
                      } catch (error) {
                        toast({
                          title: "Logo upload failed",
                          description: error instanceof Error ? error.message : "Unable to upload school logo",
                          variant: "destructive",
                        });
                      } finally {
                        setIsUploadingEditLogo(false);
                        e.target.value = "";
                      }
                    }}
                  />
                  {isUploadingEditLogo && (
                    <p className="text-xs text-gray-500">Uploading logo...</p>
                  )}
                  {editAdmin.schoolLogo && (
                    <div className="mt-2 flex items-center gap-3 rounded-md border border-slate-300 bg-slate-50 p-2">
                      <img
                        src={resolveLogoUrl(editAdmin.schoolLogo)}
                        alt="School logo preview"
                        className="h-10 w-10 shrink-0 rounded border object-cover"
                      />
                      <p className="min-w-0 flex-1 truncate text-xs text-gray-600">{editAdmin.schoolLogo}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-slate-600 hover:bg-red-50 hover:text-red-600"
                        onClick={() => setEditAdmin({ ...editAdmin, schoolLogo: "" })}
                        aria-label="Remove school logo"
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t px-6 py-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingAdmin(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateAdmin} disabled={isUpdatingAdmin}>
                {isUpdatingAdmin ? "Updating..." : "Update School"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by school name, contact person, email, or board..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {searchQuery && (
          <Button
            variant="outline"
            onClick={() => setSearchQuery('')}
            className="shrink-0"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Admin Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Schools - Orange (matching Asli Exclusive Schools) */}
        <Card className="bg-gradient-to-r from-orange-300 to-orange-400 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/90">Total Schools</p>
                <p className="text-3xl font-bold text-white">{admins?.length || 0}</p>
              </div>
              <CrownIcon className="h-12 w-12 text-white/80" />
            </div>
          </CardContent>
        </Card>

        {/* Total Students - Sky Blue (matching Content Management) */}
        <Card className="bg-gradient-to-br from-sky-300 to-sky-400 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/90">Total Students</p>
                <p className="text-3xl font-bold text-white">
                  {admins?.reduce((sum, admin) => sum + (admin?.stats?.students || 0), 0) || 0}
                </p>
              </div>
              <UsersIcon className="h-12 w-12 text-white/80" />
            </div>
          </CardContent>
        </Card>

        {/* Total Teachers - Teal (matching AI Analytics) */}
        <Card className="bg-gradient-to-br from-teal-400 to-teal-500 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/90">Total Teachers</p>
                <p className="text-3xl font-bold text-white">
                  {admins?.reduce((sum, admin) => sum + (admin?.stats?.teachers || 0), 0) || 0}
                </p>
              </div>
              <GraduationCapIcon className="h-12 w-12 text-white/80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admins List */}
      {(() => {
        // Filter admins based on search query
        const filteredAdmins = admins?.filter((admin) => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          return (
            (admin.schoolName?.toLowerCase().includes(query)) ||
            (admin.name?.toLowerCase().includes(query)) ||
            (admin.email?.toLowerCase().includes(query)) ||
            (admin.board?.toLowerCase().includes(query)) ||
            (admin.state?.toLowerCase().includes(query))
          );
        });

        return (
          <>
            {filteredAdmins && filteredAdmins.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                {filteredAdmins.map((admin) => (
          <Card key={admin?.id || Math.random().toString()} className="hover:shadow-lg transition-shadow h-full flex flex-col">
            <CardHeader className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start space-x-3 min-w-0 flex-1">
                  <div className="h-12 w-12 shrink-0 rounded-xl border border-orange-200 bg-white p-1.5 shadow-sm flex items-center justify-center overflow-hidden">
                    {admin?.schoolLogo ? (
                      <img
                        src={resolveLogoUrl(admin.schoolLogo)}
                        alt={`${admin?.schoolName || 'School'} logo`}
                        className="h-full w-full object-contain"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <CrownIcon className="h-5 w-5 text-orange-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-lg leading-tight break-words">
                      {admin?.schoolName || admin?.name || 'Unknown School'}
                    </CardTitle>
                    {admin?.name && admin?.schoolName && (
                      <p className="text-sm text-gray-600 break-words leading-snug">Contact: {admin.name}</p>
                    )}
                    {!admin?.schoolName && (
                    <p className="text-sm text-gray-600 break-all leading-snug">{admin?.email || 'No email'}</p>
                    )}
                    {admin?.schoolName && (
                      <p className="text-sm text-gray-500 break-all leading-snug">{admin?.email || 'No email'}</p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {admin?.board && (
                        <Badge variant="outline" className="text-xs break-all max-w-full">
                          {admin.board}
                        </Badge>
                      )}
                      {admin?.state && (
                        <Badge variant="outline" className="text-xs break-all max-w-full">
                          {admin.state}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Badge className="shrink-0" variant={(admin?.status || 'inactive') === 'active' ? 'default' : 'secondary'}>
                  {admin?.status || 'inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="mt-auto">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Students - Orange gradient */}
                  <div className="text-center p-3 bg-gradient-to-br from-orange-300 to-orange-400 rounded-lg text-white">
                    <UsersIcon className="h-6 w-6 text-white/80 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{admin?.stats?.students || 0}</p>
                    <p className="text-sm text-white/90">Students</p>
                  </div>
                  {/* Teachers - Teal gradient */}
                  <div className="text-center p-3 bg-gradient-to-br from-teal-400 to-teal-500 rounded-lg text-white">
                    <GraduationCapIcon className="h-6 w-6 text-white/80 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{admin?.stats?.teachers || 0}</p>
                    <p className="text-sm text-white/90">Teachers</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-sm text-gray-500">
                    Added: {admin?.joinDate ? new Date(admin.joinDate).toLocaleDateString() : 'Unknown'}
                  </span>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => admin?.id && setLocation(`/super-admin/schools/${admin.id}`)}
                      className="hover:bg-orange-50 hover:text-orange-900"
                      title="View full details"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEditClick(admin)}
                      className="hover:bg-orange-50 hover:text-orange-900"
                    >
                      <EditIcon className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDeleteAdmin(admin?.id || '')}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
            ) : searchQuery ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <SearchIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Schools Found</h3>
                  <p className="text-gray-600 mb-4">No schools match your search query "{searchQuery}"</p>
                  <Button variant="outline" onClick={() => setSearchQuery('')}>
                    Clear Search
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </>
        );
      })()}

      {(!admins || admins.length === 0) && !searchQuery && (
        <Card>
          <CardContent className="p-12 text-center">
            <CrownIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Schools Found</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first school</p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <UserPlusIcon className="h-4 w-4 mr-2" />
              Add First School
            </Button>
          </CardContent>
        </Card>
      )}

      {isMutationBusy && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex flex-col items-center gap-3 rounded-lg border bg-background px-10 py-8 shadow-lg">
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
            <p className="text-sm text-muted-foreground">
              {isAddingAdmin
                ? "Adding school…"
                : isUpdatingAdmin
                  ? "Updating school…"
                  : isDeletingAdmin
                    ? "Deleting school…"
                    : "Loading…"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
