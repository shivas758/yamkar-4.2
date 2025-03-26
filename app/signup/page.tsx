"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { 
  supabase, 
  fetchCadres, 
  fetchStates, 
  fetchDistricts, 
  fetchMandals,
  type Cadre,
  type State,
  type District,
  type Mandal
} from "@/lib/supabaseClient";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const signupSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Invalid email address.",
  }).optional().or(z.literal("")), // Allow empty string or valid email
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
  role: z.enum(["employee", "manager"]),
  manager_id: z.string().optional(),
  phone: z.string().min(10, {
    message: "Please enter a valid phone number",
  }),
  driving_license: z.string().optional(),
  aadhar_number: z.string().optional(),
  pan_number: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  mandal: z.string().optional(),
  cadre: z.string().optional(),
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const [managers, setManagers] = useState<any[]>([]);
  const [isEmployee, setIsEmployee] = useState(false);
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [availableMandals, setAvailableMandals] = useState<string[]>([]);
  const [cadres, setCadres] = useState<Cadre[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [mandals, setMandals] = useState<Mandal[]>([]);

  useEffect(() => {
    if (isEmployee) {
      fetchManagers();
    }
  }, [isEmployee]);

  const fetchManagers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name')
      .eq('role', 'manager')
      .eq('status', 'approved');

    if (error) {
      console.error("Error fetching managers:", error);
      return;
    }

    setManagers(data);
  };

  useEffect(() => {
    if (selectedDistrict) {
      const fetchMandalData = async () => {
        const mandals = await fetchMandals(selectedDistrict);
        setAvailableMandals(mandals.map(m => m.id));
      };
      fetchMandalData();
    }
  }, [selectedDistrict]);

  useEffect(() => {
    const loadInitialData = async () => {
      const [cadreData, stateData] = await Promise.all([
        fetchCadres(),
        fetchStates()
      ]);
      setCadres(cadreData);
      setStates(stateData);
    };

    loadInitialData();
  }, []);

  const handleStateChange = async (stateId: string) => {
    console.log('State selected:', stateId);
    form.setValue('district', '');
    form.setValue('mandal', '');
    setDistricts([]);
    setMandals([]);
    
    if (stateId) {
      const districtData = await fetchDistricts(stateId);
      console.log('Fetched districts:', districtData);
      if (districtData && districtData.length > 0) {
        setDistricts(districtData);
        setSelectedState(stateId);
      }
    }
  };

  const handleDistrictChange = async (districtId: string) => {
    form.setValue('mandal', '');
    setMandals([]);
    
    if (districtId) {
      const mandalData = await fetchMandals(districtId);
      setMandals(mandalData);
    }
  };

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "", // Initialize with empty string
      password: "",
      role: "manager",
      cadre: "",
      manager_id: "", // Changed from managerId
      phone: "",
      driving_license: "", // Changed from drivingLicense
      aadhar_number: "", // Changed from aadharNumber
      pan_number: "",
      state: "", // Changed from state_id
      district: "", // Changed from district_id
      mandal: "", // Changed from mandal_id
    },
  });

async function onSubmit(data: any) {
    setIsLoading(true);
    
    // Manual validation for employee-specific fields
    if (data.role === "employee") {
      const requiredFields = ["driving_license", "aadhar_number", "pan_number", "state", "district", "mandal", "cadre", "manager_id"];
      const missingFields = requiredFields.filter(field => !data[field]);
      
      if (missingFields.length > 0) {
        const fieldLabels: Record<string, string> = {
          driving_license: "Driving License",
          aadhar_number: "Aadhar Number",
          pan_number: "PAN Number",
          state: "State",
          district: "District",
          mandal: "Mandal", 
          cadre: "Cadre",
          manager_id: "Manager"
        };
        
        const missingFieldNames = missingFields.map(field => fieldLabels[field]);
        
        toast({
          title: "Missing required fields",
          description: `Please fill in the following fields: ${missingFieldNames.join(", ")}`,
          variant: "destructive",
        });
        
        setIsLoading(false);
        return;
      }
    } else if (data.role === "manager") {
      const requiredManagerFields = ["driving_license", "aadhar_number", "pan_number", "state", "district"];
      const missingFields = requiredManagerFields.filter(field => !data[field]);
      
      if (missingFields.length > 0) {
        const fieldLabels: Record<string, string> = {
          driving_license: "Driving License",
          aadhar_number: "Aadhar Number",
          pan_number: "PAN Number",
          state: "State",
          district: "District"
        };
        
        const missingFieldNames = missingFields.map(field => fieldLabels[field]);
        
        toast({
          title: "Missing required fields",
          description: `Please fill in the following fields: ${missingFieldNames.join(", ")}`,
          variant: "destructive",
        });
        
        setIsLoading(false);
        return;
      }
    }
    
    try {
      // Prepare the data for submission
      let submitData: any = {
        ...data,
        email: data.email || undefined,
      };

      // Only include employee-specific fields for employees
      if (data.role === "employee") {
        submitData.manager_id = data.manager_id;
        submitData.mandal = data.mandal;
      } else {
        // For managers, remove these fields entirely (don't set to null)
        delete submitData.manager_id;
        delete submitData.mandal;
        delete submitData.cadre;
      }

      // For debugging
      console.log("Submitting data:", submitData);

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        toast({
          title: "Signup successful!",
          description: "Please wait for admin approval.",
        });
        router.push("/");
      } else {
        const errorData = await response.json();
        toast({
          title: "Signup failed.",
          description: errorData.message || "Something went wrong.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Signup error:", error);
      // Get more specific error message if possible
      let errorMessage = "Something went wrong.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Signup failed.",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F8FF] p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-3xl font-bold text-[#228B22]">Sign Up</h1>
          <p className="text-[#6B8E23] mt-2">Create a new account</p>
        </div>
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Role <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => {
                            field.onChange(value);
                            setIsEmployee(value === "employee");
                          }}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="employee" id="employee" />
                            </FormControl>
                            <FormLabel htmlFor="employee">Employee</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="manager" id="manager" />
                            </FormControl>
                            <FormLabel htmlFor="manager">Manager</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your email" 
                          type="email" 
                          {...field} 
                          required={false} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your password" type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your phone number" {...field} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">This will be used as your login ID</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="driving_license"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Driving License Number <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Enter driving license number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="aadhar_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aadhar Number <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Enter Aadhar number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pan_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PAN Number <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Enter PAN number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isEmployee && (
                  <FormField
                    control={form.control}
                    name="cadre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cadre <span className="text-red-500">*</span></FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select cadre" />
                          </SelectTrigger>
                          <SelectContent>
                            {cadres.map((cadre) => (
                              <SelectItem key={cadre.id} value={cadre.id}>
                                {cadre.name} ({cadre.shortname})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State <span className="text-red-500">*</span></FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleStateChange(value);
                        }}
                        value={field.value}
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {districts.length > 0 && (
                  <FormField
                    control={form.control}
                    name="district"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>District <span className="text-red-500">*</span></FormLabel>
                        <Select
                          onValueChange={(value) => {
                            console.log('District selected:', value);
                            field.onChange(value);
                            if (form.getValues().role === "employee") {
                              handleDistrictChange(value);
                            }
                          }}
                          value={field.value}
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {isEmployee && mandals.length > 0 && (
                  <FormField
                    control={form.control}
                    name="mandal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mandal <span className="text-red-500">*</span></FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {isEmployee && (
                  <FormField
                    control={form.control}
                    name="manager_id"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Select Manager <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a manager" />
                            </SelectTrigger>
                            <SelectContent>
                              {managers.map((manager) => (
                                <SelectItem key={manager.id} value={manager.id}>
                                  {manager.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <Button type="submit" className="w-full bg-[#228B22] hover:bg-[#1a6b1a] text-white" disabled={isLoading}>
                  {isLoading ? "Signing up..." : "Sign Up"}
                </Button>
              </form>
            </Form>

            <div className="mt-4 text-center">
              <a href="/" className="text-[#6B8E23] text-sm hover:underline">
                Back to Sign In
              </a>
            </div>

            <div className="text-center text-sm text-[#D3D3D3] mt-4">
              © {new Date().getFullYear()} Yamkar. All rights reserved.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
