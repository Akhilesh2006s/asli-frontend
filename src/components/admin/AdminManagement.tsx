import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UsersIcon, UserPlusIcon, EditIcon, TrashIcon, CrownIcon, GraduationCapIcon, BookOpenIcon, SearchIcon, UploadIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api-config";

interface Admin {
  id: string;
  name: string;
  email: string;
  board?: string;
  state?: string;
  schoolName?: string;
  schoolLogo?: string;
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

export default function AdminManagement() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [isUpdatingAdmin, setIsUpdatingAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const SUPPORTED_BOARD = 'ASLI_EXCLUSIVE_SCHOOLS';
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    password: '',
    board: SUPPORTED_BOARD,
    state: '',
    schoolName: '',
    schoolLogo: ''
  });
  const [editAdmin, setEditAdmin] = useState({
    name: '',
    email: '',
    board: SUPPORTED_BOARD,
    state: '',
    schoolName: '',
    schoolLogo: '',
    isActive: true
  });
  const [isUploadingAddLogo, setIsUploadingAddLogo] = useState(false);
  const [isUploadingEditLogo, setIsUploadingEditLogo] = useState(false);

  // Board options
  const boardOptions = [
    { value: SUPPORTED_BOARD, label: 'ASLI_EXCLUSIVE_SCHOOLS' },
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
  const { toast } = useToast();

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
            setAdmins(data);
          } else if (data.data && Array.isArray(data.data)) {
            setAdmins(data.data);
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
    
    if (!newAdmin.name || !newAdmin.email || !newAdmin.password || !newAdmin.board || !newAdmin.state || !newAdmin.schoolName) {
      toast({
        title: "Error",
        description: "Please fill in all fields including board, state and school name",
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
        board: SUPPORTED_BOARD,
        state: newAdmin.state,
        schoolName: newAdmin.schoolName,
        schoolLogo: newAdmin.schoolLogo,
        permissions: [] // Optional, defaults to empty array
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
        const result = await response.json();
        setAdmins([...(admins || []), result.data]);
        setNewAdmin({ name: '', email: '', password: '', board: SUPPORTED_BOARD, state: '', schoolName: '', schoolLogo: '' });
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
    setEditAdmin({
      name: admin.name || '',
      email: admin.email || '',
      board: SUPPORTED_BOARD,
      state: admin.state || '',
      schoolName: admin.schoolName || '',
      schoolLogo: admin.schoolLogo || '',
      isActive: admin.status === 'active' || admin.status === 'Active'
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateAdmin = async () => {
    if (!editingAdmin?.id) {
      toast({
        title: "Error",
        description: "Invalid school ID",
        variant: "destructive",
      });
      return;
    }

    if (!editAdmin.name || !editAdmin.email || !editAdmin.board || !editAdmin.state || !editAdmin.schoolName) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
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
          board: SUPPORTED_BOARD,
          state: editAdmin.state,
          schoolName: editAdmin.schoolName,
          schoolLogo: editAdmin.schoolLogo,
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
            setAdmins(fetchData);
          } else if (fetchData.data && Array.isArray(fetchData.data)) {
            setAdmins(fetchData.data);
          }
        }
        
        setIsEditDialogOpen(false);
        setEditingAdmin(null);
        // Reset edit form
        setEditAdmin({
          name: '',
          email: '',
          board: SUPPORTED_BOARD,
          state: '',
          schoolName: '',
          schoolLogo: '',
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
    if (!adminId) {
      toast({
        title: "Error",
        description: "Invalid school ID",
        variant: "destructive",
      });
      return;
    }

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
            setAdmins(fetchData);
          } else if (fetchData.data && Array.isArray(fetchData.data)) {
            setAdmins(fetchData.data);
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New School</DialogTitle>
              <DialogDescription>
                Create a school admin account. Board is fixed to ASLI_EXCLUSIVE_SCHOOLS.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                  placeholder="Enter school administrator's full name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  placeholder="Enter school administrator's email"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                  placeholder="Enter temporary password"
                />
              </div>
              <div>
                <Label htmlFor="board">Board *</Label>
                <Select
                  value={newAdmin.board}
                  onValueChange={(value) => setNewAdmin({ ...newAdmin, board: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Board" />
                  </SelectTrigger>
                  <SelectContent>
                    {boardOptions.map((board) => (
                      <SelectItem key={board.value} value={board.value}>
                        {board.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">Board is fixed as ASLI_EXCLUSIVE_SCHOOLS.</p>
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Select
                  value={newAdmin.state}
                  onValueChange={(value) => setNewAdmin({ ...newAdmin, state: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select State" />
                  </SelectTrigger>
                  <SelectContent>
                    {stateOptions.map((state) => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">Select the state for this school</p>
              </div>
              <div>
                <Label htmlFor="schoolName">School Name *</Label>
                <Input
                  id="schoolName"
                  value={newAdmin.schoolName}
                  onChange={(e) => setNewAdmin({ ...newAdmin, schoolName: e.target.value })}
                  placeholder="Enter school name"
                />
              </div>
              <div>
                <Label htmlFor="schoolLogo">School Logo</Label>
                <div className="space-y-2">
                  <Input
                    id="schoolLogo"
                    type="file"
                    accept="image/*"
                    className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-orange-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-orange-700 hover:file:bg-orange-100"
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
                        e.target.value = '';
                      }
                    }}
                  />
                  {isUploadingAddLogo && (
                    <p className="text-xs text-gray-500">Uploading logo...</p>
                  )}
                  {newAdmin.schoolLogo && (
                    <div className="flex items-center gap-3 p-2 rounded-md border">
                      <img src={newAdmin.schoolLogo} alt="School logo preview" className="h-10 w-10 rounded object-cover border" />
                      <p className="text-xs text-gray-600 truncate">{newAdmin.schoolLogo}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddAdmin} disabled={isAddingAdmin}>
                  {isAddingAdmin ? 'Adding...' : 'Add School'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Admin Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit School</DialogTitle>
              <DialogDescription>
                Update school details. Board is fixed to ASLI_EXCLUSIVE_SCHOOLS.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Full Name *</Label>
                <Input
                  id="edit-name"
                  value={editAdmin.name}
                  onChange={(e) => setEditAdmin({ ...editAdmin, name: e.target.value })}
                  placeholder="Enter school administrator's full name"
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editAdmin.email}
                  onChange={(e) => setEditAdmin({ ...editAdmin, email: e.target.value })}
                  placeholder="Enter school administrator's email"
                />
              </div>
              <div>
                <Label htmlFor="edit-board">Board *</Label>
                <Select
                  value={editAdmin.board}
                  onValueChange={(value) => setEditAdmin({ ...editAdmin, board: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Board" />
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
              <div>
                <Label htmlFor="edit-state">State *</Label>
                <Select
                  value={editAdmin.state}
                  onValueChange={(value) => setEditAdmin({ ...editAdmin, state: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select State" />
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
              <div>
                <Label htmlFor="edit-schoolName">School Name *</Label>
                <Input
                  id="edit-schoolName"
                  value={editAdmin.schoolName}
                  onChange={(e) => setEditAdmin({ ...editAdmin, schoolName: e.target.value })}
                  placeholder="Enter school name"
                />
              </div>
              <div>
                <Label htmlFor="edit-schoolLogo">School Logo</Label>
                <div className="space-y-2">
                  <Input
                    id="edit-schoolLogo"
                    type="file"
                    accept="image/*"
                    className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-orange-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-orange-700 hover:file:bg-orange-100"
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
                        e.target.value = '';
                      }
                    }}
                  />
                  {isUploadingEditLogo && (
                    <p className="text-xs text-gray-500">Uploading logo...</p>
                  )}
                  {editAdmin.schoolLogo && (
                    <div className="flex items-center gap-3 p-2 rounded-md border">
                      <img src={editAdmin.schoolLogo} alt="School logo preview" className="h-10 w-10 rounded object-cover border" />
                      <p className="text-xs text-gray-600 truncate">{editAdmin.schoolLogo}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
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
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingAdmin(null);
                }}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateAdmin} disabled={isUpdatingAdmin}>
                  {isUpdatingAdmin ? 'Updating...' : 'Update School'}
                </Button>
              </div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                {filteredAdmins.map((admin) => (
          <Card key={admin?.id || Math.random().toString()} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start space-x-3 min-w-0 flex-1">
                  <div className="h-12 w-12 shrink-0 rounded-xl border border-orange-200 bg-white p-1.5 shadow-sm flex items-center justify-center overflow-hidden">
                    {admin?.schoolLogo ? (
                      <img
                        src={admin.schoolLogo}
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
            <CardContent>
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
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEditClick(admin)}
                      className="hover:bg-blue-50"
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
    </div>
  );
}
