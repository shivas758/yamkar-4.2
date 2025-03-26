"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Phone, Mail, Sprout, MapPin, Plus, Search, Filter, AtSign } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Crop, Farmer, District, Mandal, State, supabase } from "@/lib/supabaseClient"

export default function FarmerDataPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [farmers, setFarmers] = useState<any[]>([])
  const [crops, setCrops] = useState<Crop[]>([])
  const [states, setStates] = useState<State[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [mandals, setMandals] = useState<Mandal[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [villages, setVillages] = useState<any[]>([])

  // Form state
  const [farmerData, setFarmerData] = useState({
    name: "",
    mobile_number: "",
    email: "",
    crop_id: "",
    social_media: "",
    location: "",
    state_id: "",
    district_id: "",
    mandal_id: "",
    village_id: "",
  })

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setAuthStatus('authenticated');
          
          // Get user profile with location details
          const { data: userProfile, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (userError) {
            console.error('Error fetching user profile:', userError);
            toast.error('Error fetching your profile data');
            return;
          }
          
          setCurrentUser(userProfile);
          console.log('User profile full details:', JSON.stringify(userProfile, null, 2));
          console.log('User location fields:', {
            state: userProfile.state || 'not set',
            district: userProfile.district || 'not set',
            mandal: userProfile.mandal || 'not set'
          });
          
          // Always fetch states for dropdown options
          const stateRes = await fetch(`/api/employee/location/states`);
          const stateData = await stateRes.json();
          const states = stateData.data || [];
          setStates(states);
          
          // Allow form to be used even if location data is missing
          if (userProfile.state && userProfile.district && userProfile.mandal) {
            // Fetch district and mandal data for dropdowns
            const districtRes = await fetch(`/api/employee/location/districts?stateId=${userProfile.state}`);
            const districtData = await districtRes.json();
            const districts = districtData.data || [];
            setDistricts(districts);
            
            const mandalRes = await fetch(`/api/employee/location/mandals?districtId=${userProfile.district}`);
            const mandalData = await mandalRes.json();
            const mandals = mandalData.data || [];
            setMandals(mandals);
            
            // Find the selected items
            const selectedState = states.find((s: State) => s.id === userProfile.state);
            const selectedDistrict = districts.find((d: District) => d.id === userProfile.district);
            const selectedMandal = mandals.find((m: Mandal) => m.id === userProfile.mandal);
            
            const locationText = `${selectedMandal?.mandal_name || ''}, ${selectedDistrict?.district_name || ''}, ${selectedState?.state_name || ''}`;
            
            console.log('About to update farmerData with location:', {
              state_id: userProfile.state,
              district_id: userProfile.district,
              mandal_id: userProfile.mandal,
              location: locationText
            });
            
            // Update form state with user's location data
            setFarmerData(prev => {
              const newState = {
                ...prev,
                state_id: userProfile.state,
                district_id: userProfile.district,
                mandal_id: userProfile.mandal,
                location: locationText
              };
              console.log('Updated farmerData state:', newState);
              return newState;
            });
            
            // Fetch villages for the employee's mandal
            try {
              console.log('Fetching villages for mandal ID:', userProfile.mandal);
              const villagesRes = await fetch(`/api/employee/location/villages?mandalId=${userProfile.mandal}`);
              const villagesData = await villagesRes.json();
              
              console.log('Villages data:', villagesData);
              
              if (villagesData && villagesData.data) {
                setVillages(villagesData.data);
              } else {
                toast.warning('No villages found for your mandal');
              }
            } catch (villagesError) {
              console.error('Error fetching villages:', villagesError);
              toast.error('Failed to load villages');
            }
          } else {
            console.error('Missing location data in user profile:', userProfile);
            toast.warning('Your profile is missing location information. Please select location manually.');
          }
          
          console.log('Authenticated as:', session.user.id);
          localStorage.setItem('userId', session.user.id);
        } else {
          setAuthStatus('unauthenticated');
          console.warn('User not authenticated');
          toast.error('You must be logged in to collect farmer data');
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setAuthStatus('unauthenticated');
        toast.error('Authentication error');
      }
    };
    
    checkAuth();
  }, []);

  // Add a debug useEffect to monitor form data state changes
  useEffect(() => {
    console.log('Current farmer data state:', farmerData);
  }, [farmerData]);

  // Modify the fetchData useEffect to avoid loading duplicate state data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch farmers
        const farmersRes = await fetch('/api/employee/farmers');
        const farmersData = await farmersRes.json();
        console.log('Farmers data from API:', farmersData);
        
        if (Array.isArray(farmersData)) {
          setFarmers(farmersData);
          
          // Debug the structure of the first farmer
          if (farmersData.length > 0) {
            console.log('First farmer object structure:', JSON.stringify(farmersData[0], null, 2));
          }
        } else {
          setFarmers([]);
          console.error('Invalid farmers data format:', farmersData);
        }

        // Fetch crops
        const cropsRes = await fetch('/api/employee/farmers/crops');
        const cropsData = await cropsRes.json();
        if (Array.isArray(cropsData)) {
          setCrops(cropsData);
        } else if (cropsData && Array.isArray(cropsData.data)) {
          setCrops(cropsData.data);
        }

        // Don't fetch states here again since we already fetch them in the checkAuth useEffect
      } catch (error) {
        console.error('Error fetching initial data:', error);
        toast.error('Failed to load data: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    };

    fetchData();
  }, []);

  // Add back the state, district, and mandal change handlers to allow manual selection
  // Handle state change - fetch districts
  const handleStateChange = async (stateId: string) => {
    console.log('State selected:', stateId);
    setFarmerData({
      ...farmerData,
      state_id: stateId,
      district_id: "",
      mandal_id: "",
      village_id: "",
      location: ""
    });
    
    try {
      console.log('Fetching districts for state ID:', stateId);
      // Use API endpoint to fetch districts
      const districtsRes = await fetch(`/api/employee/location/districts?stateId=${stateId}`);
      const districtsData = await districtsRes.json();
      console.log('Districts data from API:', districtsData);
      
      if (districtsData && districtsData.data) {
        setDistricts(districtsData.data);
      } else {
        setDistricts([]);
        toast.error('No districts found for the selected state');
      }
      
      setMandals([]);
      setVillages([]);
    } catch (error) {
      console.error('Error fetching districts:', error);
      toast.error('Failed to load districts: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Handle district change - fetch mandals
  const handleDistrictChange = async (districtId: string) => {
    console.log('District selected:', districtId);
    setFarmerData({
      ...farmerData,
      district_id: districtId,
      mandal_id: "",
      village_id: "",
      location: ""
    });
    
    try {
      console.log('Fetching mandals for district ID:', districtId);
      // Use API endpoint to fetch mandals
      const mandalsRes = await fetch(`/api/employee/location/mandals?districtId=${districtId}`);
      const mandalsData = await mandalsRes.json();
      console.log('Mandals data from API:', mandalsData);
      
      if (mandalsData && mandalsData.data) {
        setMandals(mandalsData.data);
      } else {
        setMandals([]);
        toast.error('No mandals found for the selected district');
      }
      
      setVillages([]);
    } catch (error) {
      console.error('Error fetching mandals:', error);
      toast.error('Failed to load mandals: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Handle mandal change - fetch villages
  const handleMandalChange = async (mandalId: string) => {
    console.log('Mandal selected:', mandalId);
    
    // Get names for displaying location
    const selectedState = states.find((s: State) => s.id === farmerData.state_id);
    const selectedDistrict = districts.find((d: District) => d.id === farmerData.district_id);
    const selectedMandal = mandals.find((m: Mandal) => m.id === mandalId);
    
    const locationText = `${selectedMandal?.mandal_name || ''}, ${selectedDistrict?.district_name || ''}, ${selectedState?.state_name || ''}`;
    
    setFarmerData({
      ...farmerData,
      mandal_id: mandalId,
      village_id: "",
      location: locationText
    });
    
    // Fetch villages for the selected mandal
    try {
      console.log('Fetching villages for mandal ID:', mandalId);
      const villagesRes = await fetch(`/api/employee/location/villages?mandalId=${mandalId}`);
      const villagesData = await villagesRes.json();
      
      console.log('Villages data:', villagesData);
      
      if (villagesData && villagesData.data) {
        setVillages(villagesData.data);
      } else {
        setVillages([]);
        toast.warning('No villages found for the selected mandal');
      }
    } catch (error) {
      console.error('Error fetching villages:', error);
      toast.error('Failed to load villages: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Handle village change
  const handleVillageChange = (villageId: string) => {
    console.log('Village selected:', villageId);
    const selectedVillage = villages.find(village => village.id === villageId);
    console.log('Selected village:', selectedVillage);
    
    setFarmerData({
      ...farmerData,
      village_id: villageId
    });
  };

  // Filter farmers based on search query
  const filteredFarmers = farmers.filter(
    (farmer) => {
      const cropName = farmer.crop?.name || getCropName(farmer.crop_id);
      
      return farmer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cropName.toLowerCase().includes(searchQuery.toLowerCase());
    }
  );

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFarmerData({
      ...farmerData,
      [id]: value
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        toast.error('You must be logged in to submit data');
        return;
      }

      // Prepare the request payload with the current user's ID
      const farmerPayload = {
        name: farmerData.name,
        mobile_number: farmerData.mobile_number,
        email: farmerData.email || undefined,
        state_id: farmerData.state_id,
        district_id: farmerData.district_id,
        mandal_id: farmerData.mandal_id,
        village_id: farmerData.village_id,
        crop_id: farmerData.crop_id,
        collected_by: session.user.id,
        social_media: farmerData.social_media || ''
      };

      // Submit the data
      const response = await fetch('/api/employee/farmers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(farmerPayload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit farmer data');
      }

      // Success handling
      toast.success('Farmer data added successfully!');
      setIsDialogOpen(false);
      
      // Reset form
      setFarmerData({
        name: "",
        mobile_number: "",
        email: "",
        crop_id: "",
        social_media: "",
        location: currentUser ? `${currentUser.mandal_name || ''}, ${currentUser.district_name || ''}, ${currentUser.state_name || ''}` : "",
        state_id: currentUser?.state || "",
        district_id: currentUser?.district || "",
        mandal_id: currentUser?.mandal || "",
        village_id: ""
      });
      
      // Refresh the farmers list
      try {
        const farmersRes = await fetch('/api/employee/farmers');
        const farmersData = await farmersRes.json();
        if (Array.isArray(farmersData)) {
          setFarmers(farmersData);
        } else if (farmersData && Array.isArray(farmersData.data)) {
          setFarmers(farmersData.data);
        }
      } catch (refreshError) {
        console.error('Error refreshing farmer list:', refreshError);
      }

    } catch (error) {
      console.error('Error submitting farmer data:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit farmer data');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to check if location fields are populated in the form
  // Note: This still uses state_id, district_id, mandal_id because these are the field names in the form state
  const isLocationMissing = () => {
    return !farmerData.state_id || farmerData.state_id === "" || 
           !farmerData.district_id || farmerData.district_id === "" || 
           !farmerData.mandal_id || farmerData.mandal_id === "";
  };

  // Helper function to get crop name from crop_id
  const getCropName = (cropId: any): string => {
    // Try to find in the crops list first
    if (typeof cropId === 'string') {
      const crop = crops.find(c => c.id === cropId);
      if (crop) return crop.name;
    }
    
    // If not found in crops list, check if the farmer record has a joined crop object
    if (cropId && typeof cropId === 'object' && 'name' in cropId) {
      return cropId.name as string;
    }
    
    return "Unknown Crop";
  };

  // Helper function to get location string from farmer object
  const getLocationString = (farmer: any): string => {
    // Check if the farmer has joined state/district/mandal objects with names
    if (farmer.state && 
        farmer.district && 
        farmer.mandal && 
        'state_name' in farmer.state && 
        'district_name' in farmer.district && 
        'mandal_name' in farmer.mandal) {
      return `${farmer.mandal.mandal_name}, ${farmer.district.district_name}, ${farmer.state.state_name}`;
    }
    
    // If not, try to look up by IDs from our loaded lists
    const state = states.find(s => s.id === farmer.state_id);
    const district = districts.find(d => d.id === farmer.district_id);
    const mandal = mandals.find(m => m.id === farmer.mandal_id);
    
    if (state && district && mandal) {
      return `${mandal.mandal_name}, ${district.district_name}, ${state.state_name}`;
    }
    
    return "Location details not available";
  };
  
  // Helper function to format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown date";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return "Invalid date";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#228B22]">Farmer Data Collection</h1>
        
        {authStatus === 'loading' ? (
          <div className="text-sm text-gray-500">Checking authentication...</div>
        ) : authStatus === 'authenticated' ? (
          <div className="text-sm text-green-600">
            Logged in as: {currentUser?.email ? currentUser.email.split('@')[0] : `User ${currentUser?.id?.substring(0, 8)}...`}
          </div>
        ) : (
          <div className="text-sm text-red-600">
            You must be logged in to collect farmer data
          </div>
        )}
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-[#228B22] hover:bg-[#1a6b1a] flex items-center gap-2"
              disabled={authStatus !== 'authenticated'}
            >
              <Plus className="h-4 w-4" />
              Collect Farmer Data
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-[#228B22]">Farmer Information</DialogTitle>
              <DialogDescription>
                Enter the farmer's details below. All fields marked with * are required.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Farmer's Full Name *
                </Label>
                <Input 
                  id="name" 
                  value={farmerData.name}
                  onChange={handleInputChange}
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile_number" className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  Farmer's Mobile Number *
                </Label>
                <Input 
                  id="mobile_number" 
                  type="tel" 
                  value={farmerData.mobile_number}
                  onChange={handleInputChange}
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  Farmer's Email (optional)
                </Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={farmerData.email}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Location *
                </Label>
                <div className="grid grid-cols-1 gap-2">
                  {/* Location Fields */}
                  {isLocationMissing() ? (
                    // Show dropdowns for manual selection if employee's location is not set
                    <>
                      <Select
                        value={farmerData.state_id}
                        onValueChange={handleStateChange}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {states.map((state) => (
                            <SelectItem key={state.id} value={state.id}>
                              {state.state_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select
                        value={farmerData.district_id}
                        onValueChange={handleDistrictChange}
                        disabled={!farmerData.state_id}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select district" />
                        </SelectTrigger>
                        <SelectContent>
                          {districts.map((district) => (
                            <SelectItem key={district.id} value={district.id}>
                              {district.district_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select
                        value={farmerData.mandal_id}
                        onValueChange={handleMandalChange}
                        disabled={!farmerData.district_id}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select mandal" />
                        </SelectTrigger>
                        <SelectContent>
                          {mandals.map((mandal) => (
                            <SelectItem key={mandal.id} value={mandal.id}>
                              {mandal.mandal_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  ) : (
                    // Show read-only location if employee's location is already set
                    <Input 
                      id="location" 
                      value={farmerData.location}
                      disabled
                    />
                  )}
                  
                  <Select
                    value={farmerData.village_id}
                    onValueChange={handleVillageChange}
                    disabled={!farmerData.mandal_id || villages.length === 0}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select village" />
                    </SelectTrigger>
                    <SelectContent>
                      {villages.length === 0 && (
                        <SelectItem value="no-villages-found">No villages found</SelectItem>
                      )}
                      {villages.map((village) => (
                        <SelectItem key={village.id} value={village.id}>
                          {village.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="crop_id" className="flex items-center gap-1">
                  <Sprout className="h-4 w-4" />
                  Crop Type *
                </Label>
                <Select 
                  value={farmerData.crop_id}
                  onValueChange={(value) => setFarmerData({...farmerData, crop_id: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select crop type" />
                  </SelectTrigger>
                  <SelectContent>
                    {crops.map((crop) => (
                      <SelectItem key={crop.id} value={crop.id}>
                        {crop.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="social_media" className="flex items-center gap-1">
                  <AtSign className="h-4 w-4" />
                  Social Media (optional)
                </Label>
                <Input
                  id="social_media"
                  value={farmerData.social_media}
                  onChange={handleInputChange}
                  placeholder="Social media handles or accounts"
                />
              </div>

              <DialogFooter>
                <Button 
                  type="submit" 
                  className="bg-[#228B22] hover:bg-[#1a6b1a]"
                  disabled={isLoading || authStatus !== 'authenticated'}
                >
                  {isLoading ? "Submitting..." : (authStatus === 'authenticated' ? "Submit Data" : "Login Required")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6B8E23]" />
          <Input
            placeholder="Search farmers..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select>
          <SelectTrigger className="w-full md:w-[180px]">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span>Filter by Crop</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Crops</SelectItem>
            {crops.map((crop) => (
              <SelectItem key={crop.id} value={crop.id}>
                {crop.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {filteredFarmers.length > 0 ? (
          filteredFarmers.map((farmer) => (
            <Card key={farmer.id}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="font-medium text-[#228B22]">{farmer.name}</div>
                    <div className="text-sm flex items-center gap-2">
                      <Phone className="h-3 w-3 text-[#6B8E23]" />
                      <span>{farmer.mobile_number}</span>
                    </div>
                    {farmer.email && (
                      <div className="text-sm flex items-center gap-2">
                        <Mail className="h-3 w-3 text-[#6B8E23]" />
                        <span>{farmer.email}</span>
                      </div>
                    )}
                    {farmer.social_media && (
                      <div className="text-sm flex items-center gap-2">
                        <AtSign className="h-3 w-3 text-[#6B8E23]" />
                        <span>{farmer.social_media}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                    <div className="px-3 py-1 bg-[#F4A460] bg-opacity-20 rounded-full text-xs flex items-center gap-1">
                      <Sprout className="h-3 w-3 text-[#6B8E23]" />
                      {typeof farmer.crop === 'object' && farmer.crop && 'name' in farmer.crop 
                        ? (farmer.crop.name as string) 
                        : getCropName(farmer.crop_id)}
                    </div>
                    <div className="text-xs text-gray-600">
                      <MapPin className="h-3 w-3 inline mr-1 text-[#6B8E23]" />
                      {getLocationString(farmer)}
                    </div>
                    <div className="text-xs text-gray-600">
                      Collected: {formatDate(farmer.created_at)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center p-8">
            <div className="text-[#D3D3D3] mb-2">No farmers found</div>
            <div className="text-sm">Try adjusting your search or add a new farmer</div>
          </div>
        )}
      </div>
    </div>
  )
}

