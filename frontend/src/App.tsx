import { useState, type KeyboardEvent, useEffect } from 'react';
import { Search, Pill, PackageX, AlertTriangle, CheckCircle, XCircle, Download, Loader2, RotateCcw, Upload, Plus, Trash2, FileText, Play, Square } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  // AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import axiosInstance from './api/axiosInstance';
import * as XLSX from 'xlsx'

// Define TypeScript interfaces for the data structure
interface Product {
  title: string;
  price: string;
  link: string;
}

interface SearchResults {
  [source: string]: Product[];
}

interface ApiResponse {
  status: string;
  message: string;
  data: SearchResults;
  errors?: { [source: string]: string };
  summary?: {
    totalProducts: number;
    successfulSources: number;
    failedSources: number;
    searchTerm: string;
  };
}

// New interfaces for multiple item search
interface MultipleSearchItem {
  id: string;
  name: string;
  status: 'pending' | 'searching' | 'completed' | 'cancelled';
  results?: { [source: string]: Product[] };
  errors?: { [source: string]: string };
  progress?: number;
}

interface MultipleSearchProgress {
  items: MultipleSearchItem[];
  currentItem: number;
  totalItems: number;
  status: 'pending' | 'running' | 'completed' | 'cancelled';
  canCancel: boolean;
}

type SearchMode = 'single' | 'multiple';
type PharmacyStatus = 'pending' | 'success' | 'failed';

interface PharmacyProgress {
  [source: string]: PharmacyStatus;
}

function App() {
  // State for the search query input
  const [searchQuery, setSearchQuery] = useState<string>('');
  // State to manage the loading state during the search
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // State to store the search results
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  // State to store API response with errors
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  // State to track the active tab
  const [activeTab, setActiveTab] = useState<string>('all');
  // State to track if search has been performed
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  // State to track pharmacy progress
  const [pharmacyProgress, setPharmacyProgress] = useState<PharmacyProgress>({});
  // State to track which pharmacies are being refreshed
  const [refreshingPharmacies, setRefreshingPharmacies] = useState<Set<string>>(new Set());
  
  // State to track which items are being refreshed in multiple search
  const [refreshingItems, setRefreshingItems] = useState<Set<string>>(new Set());

  // Multiple search states
  const [searchMode, setSearchMode] = useState<SearchMode>('single');
  const [multipleItems, setMultipleItems] = useState<string[]>([]);
  const [newItemName, setNewItemName] = useState<string>('');
  const [, setUploadedFile] = useState<File | null>(null);
  const [previewItems, setPreviewItems] = useState<string[]>([]);
  const [multipleSearchSession, setMultipleSearchSession] = useState<string | null>(null);
  const [multipleSearchProgress, setMultipleSearchProgress] = useState<MultipleSearchProgress | null>(null);
  const [isMultipleSearchRunning, setIsMultipleSearchRunning] = useState<boolean>(false);
  const [showCancelDialog, setShowCancelDialog] = useState<boolean>(false);

  const pharmacySources = ['TGP', 'Southstar', 'Watsons', 'Rose Pharmacy', 'GetMeds'];

  // Pharmacy brand colors
  const pharmacyColors: { [key: string]: string } = {
    'TGP': '#e51d25',
    'Southstar': '#005dab',
    'Watsons': '#009AA9',
    'Rose Pharmacy': '#A71C30',
    'GetMeds': '#1D9FDA'
  };

  // Pharmacy logos
  const pharmacyLogos: { [key: string]: string } = {
    'TGP': '/tgp.png',
    'Southstar': '/southstar.png',
    'Watsons': '/watsons.png',
    'Rose Pharmacy': '/rosepharmacy.png',
    'GetMeds': '/getmeds.png'
  };

  // Initialize pharmacy progress during search
  useEffect(() => {
    if (isLoading) {
      // Initialize all pharmacies as pending
      const initialProgress: PharmacyProgress = {};
      pharmacySources.forEach(source => {
        initialProgress[source] = 'pending';
      });
      setPharmacyProgress(initialProgress);

      // Status will be updated when API call completes with actual results
      // No simulation needed - real scraping results will update the status
    }
  }, [isLoading]);

  const exportToExcel = (data: SearchResults) => {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Iterate over each source in the data
    Object.keys(data).forEach((source) => {
      // Map the products to the desired format
      const products = data[source].map((product) => ({
        Source: source,
        Title: product.title,
        Price: product.price,
        Link: product.link
      }));
      
      // Create a worksheet for this source
      const sourceSheet = XLSX.utils.json_to_sheet(products);
      
      // Append the worksheet to the workbook
      XLSX.utils.book_append_sheet(workbook, sourceSheet, source);
    });

    // Save the workbook to a file
    XLSX.writeFile(workbook, 'search_results.xlsx');
  };

  const handleSearch = async () => {
    try {
      const payload = searchQuery.trim();
      if (!payload) {
        return;
      }

      setIsLoading(true);
      setSearchResults(null);
      setApiResponse(null);
      setHasSearched(true);

      console.log('🚀 Starting API request for:', payload);
      
      await axiosInstance.get(`/scrape/all?SEARCH_TERM=${encodeURIComponent(payload)}`)
        .then((response) => {
          console.log('📡 Raw response received:', response);
          console.log('📊 Response status:', response.status);
          console.log('📦 Response headers:', response.headers);
          
          if (response.status === 200) {
            const apiData = response.data as ApiResponse;
            console.log('🔍 Frontend received API response:', apiData);
            console.log('📊 Data keys:', Object.keys(apiData.data || {}));
            console.log('📋 Data contents:', apiData.data);
            console.log('🎯 API Status:', apiData.status);
            console.log('💬 API Message:', apiData.message);
            
            // Debug: Check for key mismatches
            console.log('🔍 Debugging key mismatches:');
            console.log('Frontend expects:', pharmacySources);
            console.log('Backend returned:', Object.keys(apiData.data || {}));
            Object.keys(apiData.data || {}).forEach(key => {
              console.log(`📦 "${key}": ${apiData.data[key]?.length || 0} products`);
            });
            
            if (apiData.errors) {
              console.log('⚠️ API Errors:', apiData.errors);
            }
            
            setApiResponse(apiData);
            setSearchResults(apiData.data);
            
            // Update pharmacy progress based on actual results
            const finalProgress: PharmacyProgress = {};
            pharmacySources.forEach(source => {
              const hasProducts = apiData.data[source] && apiData.data[source].length > 0;
              const hasError = apiData.errors && apiData.errors[source];
              
              console.log(`🏪 ${source}: products=${hasProducts ? apiData.data[source].length : 0}, error=${hasError ? 'yes' : 'no'}`);
              
              if (hasProducts) {
                finalProgress[source] = 'success'; // Has actual product data
              } else if (hasError) {
                finalProgress[source] = 'failed'; // Explicit error occurred
              } else {
                finalProgress[source] = 'failed'; // No products found (could be no matches or scraping issue)
              }
            });
            
            console.log('🚦 Final pharmacy status based on actual results:', finalProgress);
            setPharmacyProgress(finalProgress);
            
            // Always set active tab to 'all' by default
            setActiveTab('all');
          } else {
            console.error("Error fetching search results:", response.statusText);
            setApiResponse({
              status: "error",
              message: "Failed to fetch search results",
              data: {}
            });
            // Mark all as failed
            const failedProgress: PharmacyProgress = {};
            pharmacySources.forEach(source => {
              failedProgress[source] = 'failed';
            });
            setPharmacyProgress(failedProgress);
          }
        })
        .catch((error) => {
          console.error("❌ Error fetching search results:", error);
          console.error("🔍 Error details:", {
            code: error.code,
            message: error.message,
            response: error.response,
            request: error.request,
            config: error.config
          });
          
          let errorMessage = "Network error occurred while searching.";
          
          if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            console.log('⏱️ Request timed out');
            errorMessage = "Search is taking longer than expected. The backend might still be processing. Please wait a moment and try again.";
          } else if (error.code === 'ECONNREFUSED') {
            console.log('🚫 Connection refused');
            errorMessage = "Cannot connect to backend server. Please make sure the backend is running on port 3000.";
          } else if (error.response?.status === 500) {
            console.log('💥 Server error 500');
            errorMessage = "Backend server error occurred during scraping.";
          } else if (error.response?.data?.message) {
            console.log('📝 Server provided error message:', error.response.data.message);
            errorMessage = error.response.data.message;
          } else {
            console.log('❓ Unknown error type');
          }
          
          setApiResponse({
            status: "error",
            message: errorMessage,
            data: {}
          });
          // Mark all as failed
          const failedProgress: PharmacyProgress = {};
          pharmacySources.forEach(source => {
            failedProgress[source] = 'failed';
          });
          setPharmacyProgress(failedProgress);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } catch (error) {
      console.error("Error in handleSearch:", error);
      setIsLoading(false);
      setApiResponse({
        status: "error",
        message: "An unexpected error occurred",
        data: {}
      });
      // Mark all as failed
      const failedProgress: PharmacyProgress = {};
      pharmacySources.forEach(source => {
        failedProgress[source] = 'failed';
      });
      setPharmacyProgress(failedProgress);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  // Function to refresh a specific pharmacy
  const refreshPharmacy = async (pharmacyName: string) => {
    if (!searchQuery.trim()) {
      console.error('No search query available for refresh');
      return;
    }

    console.log(`🔄 Refreshing ${pharmacyName}...`);
    
    // Add pharmacy to refreshing set
    setRefreshingPharmacies(prev => new Set(prev).add(pharmacyName));
    
    // Set pharmacy status to pending
    setPharmacyProgress(prev => ({
      ...prev,
      [pharmacyName]: 'pending'
    }));

    try {
      const response = await axiosInstance.get(`/scrape/single?SEARCH_TERM=${encodeURIComponent(searchQuery.trim())}&PHARMACY=${encodeURIComponent(pharmacyName)}`);
      
      if (response.status === 200) {
        const refreshData = response.data;
        console.log(`✅ ${pharmacyName} refresh completed:`, refreshData);
        
        // Update search results with new data for this pharmacy
        setSearchResults(prev => ({
          ...prev,
          [pharmacyName]: refreshData.data || []
        }));
        
        // Update API response to include new data
        setApiResponse(prev => {
          if (!prev) return prev;
          
          const updatedData = { ...prev.data, [pharmacyName]: refreshData.data || [] };
          const updatedErrors = { ...prev.errors };
          
          // Remove error for this pharmacy if refresh was successful
          if (refreshData.success && updatedErrors[pharmacyName]) {
            delete updatedErrors[pharmacyName];
          } else if (!refreshData.success) {
            updatedErrors[pharmacyName] = refreshData.error || 'Refresh failed';
          }
          
          // Recalculate summary
          const totalProducts = Object.values(updatedData).reduce((sum, products) => sum + (products?.length || 0), 0);
          const successfulSources = Object.keys(updatedData).filter(key => updatedData[key]?.length > 0).length;
          const failedSources = Object.keys(updatedErrors).length;
          
          return {
            ...prev,
            data: updatedData,
            errors: Object.keys(updatedErrors).length > 0 ? updatedErrors : undefined,
            summary: {
              totalProducts,
              successfulSources,
              failedSources,
              searchTerm: prev.summary?.searchTerm || searchQuery.trim()
            }
          };
        });
        
        // Update pharmacy status
        const hasProducts = refreshData.data && refreshData.data.length > 0;
        setPharmacyProgress(prev => ({
          ...prev,
          [pharmacyName]: hasProducts ? 'success' : 'failed'
        }));
        
      } else {
        console.error(`❌ ${pharmacyName} refresh failed:`, response.statusText);
        setPharmacyProgress(prev => ({
          ...prev,
          [pharmacyName]: 'failed'
        }));
      }
    } catch (error) {
      console.error(`❌ Error refreshing ${pharmacyName}:`, error);
      setPharmacyProgress(prev => ({
        ...prev,
        [pharmacyName]: 'failed'
      }));
    } finally {
      // Remove pharmacy from refreshing set
      setRefreshingPharmacies(prev => {
        const newSet = new Set(prev);
        newSet.delete(pharmacyName);
        return newSet;
      });
    }
  };

  // Multiple search functions
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      if (!data) return;

      try {
        let items: string[] = [];
        
        if (file.name.endsWith('.csv')) {
          // Parse CSV
          const text = data as string;
          const lines = text.split('\n');
          items = lines
            .slice(1) // Skip header row
            .map(line => line.split(',')[0]?.trim()) // Take first column
            .filter(item => item && item.length > 0 && !isHeaderLike(item));
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          // Parse Excel
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][];
          items = jsonData
            .slice(1) // Skip header row
            .map(row => row[0]?.toString().trim()) // Take first column
            .filter(item => item && item.length > 0 && !isHeaderLike(item));
        }

        // Remove duplicates and limit to reasonable number
        const uniqueItems = [...new Set(items)].slice(0, 100); // Limit to 100 items
        setPreviewItems(uniqueItems);
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('Error parsing file. Please check the file format.');
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  // Helper function to detect header-like rows
  const isHeaderLike = (item: string): boolean => {
    const lowerItem = item.toLowerCase();
    const headerKeywords = ['medicine', 'name', 'product', 'item', 'drug', 'medication'];
    return headerKeywords.some(keyword => lowerItem.includes(keyword));
  };

  const confirmFileUpload = () => {
    setMultipleItems(previewItems);
    setPreviewItems([]);
    setUploadedFile(null);
  };

  const cancelFileUpload = () => {
    setPreviewItems([]);
    setUploadedFile(null);
  };

  const addManualItem = () => {
    if (newItemName.trim()) {
      setMultipleItems([...multipleItems, newItemName.trim()]);
      setNewItemName('');
    }
  };

  const removeItem = (index: number) => {
    setMultipleItems(multipleItems.filter((_, i) => i !== index));
  };

  const startMultipleSearch = async () => {
    if (multipleItems.length === 0) return;

    try {
      setIsMultipleSearchRunning(true);
      
      const response = await axiosInstance.post('/scrape/multiple', {
        items: multipleItems
      });

      if (response.status === 200) {
        const { sessionId, progress } = response.data;
        setMultipleSearchSession(sessionId);
        setMultipleSearchProgress(progress);
        
        // Start polling for progress
        pollSearchProgress(sessionId);
      }
    } catch (error) {
      console.error('Error starting multiple search:', error);
      setIsMultipleSearchRunning(false);
      alert('Error starting search. Please try again.');
    }
  };

  const pollSearchProgress = async (sessionId: string) => {
    try {
      const response = await axiosInstance.get(`/scrape/progress/${sessionId}`);
      
      if (response.status === 200) {
        const { progress } = response.data;
        setMultipleSearchProgress(progress);
        
        if (progress.status === 'running') {
          // Poll very frequently (every 500ms) when search is running for faster cancellation response
          setTimeout(() => pollSearchProgress(sessionId), 500);
        } else if (progress.status === 'cancelled') {
          // Handle cancellation
          setIsMultipleSearchRunning(false);
          console.log('Search was cancelled');
        } else if (progress.status === 'completed') {
          // Search completed
          setIsMultipleSearchRunning(false);
          console.log('Search completed');
        }
      }
    } catch (error) {
      console.error('Error polling search progress:', error);
      setIsMultipleSearchRunning(false);
    }
  };

  const cancelMultipleSearch = async () => {
    if (!multipleSearchSession) return;

    try {
      await axiosInstance.post(`/scrape/cancel/${multipleSearchSession}`);
      console.log('Cancel request sent to backend');
    } catch (error) {
      console.error('Error cancelling search:', error);
      // If backend cancel fails, still update UI to show cancelled state
      setMultipleSearchProgress(prev => prev ? { ...prev, status: 'cancelled', canCancel: false } : null);
    }
  };

  const handleCancelClick = () => {
    setShowCancelDialog(true);
  };

  const handleCancelConfirm = () => {
    // Immediately update UI to show cancelling state
    setMultipleSearchProgress(prev => prev ? { ...prev, status: 'cancelled', canCancel: false } : null);
    setIsMultipleSearchRunning(false);
    setShowCancelDialog(false);
    
    // Then actually cancel on the backend
    cancelMultipleSearch();
  };

  const handleCancelCancel = () => {
    setShowCancelDialog(false);
  };

  const exportMultipleResults = () => {
    if (!multipleSearchProgress) return;

    const workbook = XLSX.utils.book_new();

    // Create summary sheet
    const summaryData = multipleSearchProgress.items.map(item => ({
      'Item Name': item.name,
      'Status': item.status,
      'Total Results': item.results ? Object.values(item.results).reduce((sum, products) => sum + products.length, 0) : 0,
      'Sources Found': item.results ? Object.keys(item.results).filter(source => item.results![source].length > 0).length : 0
    }));
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Create detailed sheets for each item
    multipleSearchProgress.items.forEach(item => {
      if (item.results) {
        const itemData: any[] = [];
        Object.entries(item.results).forEach(([source, products]) => {
          products.forEach(product => {
            itemData.push({
              'Item': item.name,
              'Source': source,
              'Title': product.title,
              'Price': product.price,
              'Link': product.link
            });
          });
        });
        
        if (itemData.length > 0) {
          const itemSheet = XLSX.utils.json_to_sheet(itemData);
          const safeSheetName = item.name.replace(/[\\\/\?\*\[\]]/g, '_').substring(0, 31);
          XLSX.utils.book_append_sheet(workbook, itemSheet, safeSheetName);
        }
      }
    });

    XLSX.writeFile(workbook, 'multiple_search_results.xlsx');
  };

  const downloadTemplate = () => {
    const templateData = [
      ['Medicine Name'],
      ['Paracetamol'],
      ['Tylenol']
    ];
    
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, 'medicine_template.xlsx');
  };

  // Refresh specific failed pharmacies for a single item
  const refreshItemPharmacies = async (itemId: string, itemName: string) => {
    if (!multipleSearchSession || refreshingItems.has(itemId)) {
      console.log(`Refresh already in progress for ${itemName} or no session`);
      return;
    }

    try {
      setRefreshingItems(prev => new Set([...prev, itemId]));

      // Find the item and get failed pharmacies
      const item = multipleSearchProgress?.items.find(i => i.id === itemId);
      if (!item || !item.errors) {
        console.log(`No item found or no errors for ${itemName}`);
        return;
      }

      const failedPharmacies = Object.keys(item.errors);
      console.log(`🔄 Refreshing failed pharmacies for ${itemName}:`, failedPharmacies);

      const response = await axiosInstance.post(
        `/scrape/refresh/${multipleSearchSession}/${itemId}`,
        { failedPharmacies }
      );

      console.log(`📡 Refresh response for ${itemName}:`, response.data);

      if (response.data.status === 'success') {
        // Update the progress state with the refreshed item
        setMultipleSearchProgress(prev => {
          if (!prev) return prev;
          
          const updatedItems = prev.items.map(existingItem => 
            existingItem.id === itemId ? response.data.item : existingItem
          );
          
          return {
            ...prev,
            items: updatedItems
          };
        });
        
        console.log(`✅ Successfully refreshed pharmacies for ${itemName}`);
      } else {
        console.error(`❌ Refresh failed for ${itemName}:`, response.data.message);
      }
    } catch (error: any) {
      console.error(`💥 Error refreshing pharmacies for ${itemName}:`, error);
      if (error?.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
    } finally {
      // Add a small delay to prevent rapid consecutive clicks
      setTimeout(() => {
        setRefreshingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }, 1000); // 1 second delay before allowing another refresh
    }
  };

  // Pharmacy Status Indicator Component
  const PharmacyStatusIndicator = ({ source, status, productCount }: { source: string; status: PharmacyStatus; productCount?: number }) => {
    const brandColor = pharmacyColors[source] || '#14b8a6';
    const logoSrc = pharmacyLogos[source];
    const isRefreshing = refreshingPharmacies.has(source);
    const canRefresh = (status === 'failed' || (apiResponse?.errors && apiResponse.errors[source])) && hasSearched && !isLoading;
    const getStatusConfig = (status: PharmacyStatus) => {
      // Override status if refreshing
      if (isRefreshing) {
        return {
          color: 'bg-blue-500',
          icon: <Loader2 className="h-3 w-3 animate-spin text-white" />,
          text: 'Refreshing...',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-200'
        };
      }

      switch (status) {
        case 'pending':
          return {
            color: 'bg-amber-500',
            icon: <Loader2 className="h-3 w-3 animate-spin text-white" />,
            text: isLoading ? 'Searching...' : 'Pending',
            textColor: 'text-amber-700',
            borderColor: 'border-amber-200'
          };
        case 'success':
          return {
            color: 'bg-green-500',
            icon: <CheckCircle className="h-3 w-3 text-white" />,
            text: productCount ? `${productCount} Products Found` : 'Success',
            textColor: 'text-green-700',
            borderColor: 'border-green-200'
          };
        case 'failed':
          return {
            color: 'bg-red-500',
            icon: <XCircle className="h-3 w-3 text-white" />,
            text: isLoading ? 'Failed' : 'No Results Found',
            textColor: 'text-red-700',
            borderColor: 'border-red-200'
          };
      }
    };

    const config = getStatusConfig(status);

    return (
      <div className={`flex items-center space-x-3 p-3 bg-white rounded-lg border ${config.borderColor} shadow-sm transition-all duration-300`}>
        <div className="relative">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
            style={{ backgroundColor: isRefreshing ? '#3b82f6' : brandColor }}
          >
            {config.icon}
          </div>
          {logoSrc && (
            <img 
              src={logoSrc} 
              alt={`${source} logo`}
              className="absolute -top-1 -right-1 h-4 w-4 object-contain bg-white rounded-full p-0.5 border border-slate-200"
            />
          )}
        </div>
        <div className="flex-1">
          <div 
            className="font-medium flex items-center"
            style={{ color: brandColor }}
          >
            {source}
          </div>
          <div className={`text-sm ${config.textColor}`}>{config.text}</div>
        </div>
        {canRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshPharmacy(source)}
            disabled={isRefreshing}
            className="h-8 px-2 text-xs border-slate-300"
            style={{ 
              borderColor: brandColor + '40',
              color: brandColor
            }}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
    );
  };

  // Standalone Pharmacy Status Component (always visible after first search)
  const PharmacyStatusGrid = () => (
    <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 mb-8">
      <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
        <Pill className="h-5 w-5 mr-2 text-teal-600" />
        {isLoading ? 'Search Progress' : 'Search Results by Pharmacy'}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {pharmacySources.map(source => {
          const productCount = searchResults?.[source]?.length || 0;
          return (
            <PharmacyStatusIndicator 
              key={source} 
              source={source} 
              status={pharmacyProgress[source] || 'pending'} 
              productCount={productCount > 0 ? productCount : undefined}
            />
          );
        })}
      </div>
    </div>
  );

  // Enhanced Loading Component
  const LoadingWithProgress = () => (
    <div className="space-y-8">

      {/* Enhanced Loading Skeleton */}
      <div className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-t-4 border-b-4 border-teal-500 animate-spin"></div>
            <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-t-4 border-b-4 border-teal-200 animate-pulse"></div>
          </div>
        </div>
        
        <div className="text-center">
          <h3 className="text-xl font-semibold text-teal-700 mb-2">Searching pharmacies...</h3>
          <p className="text-slate-600">Comparing prices across multiple sources</p>
        </div>

        {/* Improved Skeleton Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden animate-pulse border-slate-200">
              <CardContent className="p-0">
                <div className="bg-gradient-to-r from-teal-500 to-teal-600 py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Skeleton className="h-4 w-4 bg-teal-400 rounded mr-2" />
                      <Skeleton className="h-4 w-16 bg-teal-400" />
                    </div>
                    <Skeleton className="h-5 w-16 bg-teal-400 rounded-full" />
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-3/5" />
                  <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-8 w-24 rounded-md" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  // Loading Spinner Component (inline)
  const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <LoadingWithProgress />
    </div>
  );

  // Empty State Component (inline)
  const EmptyState = ({ sourceName }: { sourceName: string }) => (
    <div className="flex flex-col items-center justify-center py-8 px-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
      <PackageX className="h-10 w-10 text-slate-400 mb-3" />
      <h3 className="text-lg font-medium text-slate-700">No results found</h3>
      <p className="text-sm text-slate-500 text-center mt-1">We couldn't find this medicine at {sourceName}</p>
    </div>
  );

  // Product Card Component (inline)
  const ProductCard = ({ product, source, index }: { product: Product; source: string; index: number }) => {
    const brandColor = pharmacyColors[source] || '#14b8a6'; // fallback to teal
    const logoSrc = pharmacyLogos[source];
    
    return (
      <Card 
        className="overflow-hidden transition-all duration-300 hover:shadow-md border-slate-200 hover:-translate-y-1"
        style={{
          animationDelay: `${index * 0.1}s`,
        }}
      >
        <CardContent className="p-0">
          <div 
            className="py-3 px-4"
            style={{ 
              background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}dd 100%)` 
            }}
          >
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center">
                {logoSrc ? (
                  <img 
                    src={logoSrc} 
                    alt={`${source} logo`}
                    className="h-5 w-5 mr-2 object-contain bg-white rounded-sm p-0.5"
                  />
                ) : (
                  <Pill className="h-4 w-4 mr-2" />
                )}
                <h3 className="font-medium text-sm truncate">{source}</h3>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                Available
              </Badge>
            </div>
          </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-2 text-slate-800 line-clamp-2">{product.title}</h3>
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center font-bold text-xl"
              style={{ color: brandColor }}
            >
              <span>{product.price?.replace("PHP", "") || "Price not available"}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              asChild
              className="border-slate-300 hover:border-opacity-70"
              style={{ 
                borderColor: brandColor + '40',
                color: brandColor,
                '--tw-ring-color': brandColor + '20'
              } as React.CSSProperties}
            >
              <a href={product.link} target="_blank" rel="noopener noreferrer">
                View Product
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
    );
  };

  // Source Status Component
  const SourceStatus = ({ source, hasData, error }: { source: string; hasData: boolean; error?: string }) => (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium">{source}</span>
      {hasData ? (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Success
        </Badge>
      ) : (
        <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      )}
      {error && (
        <span className="text-xs text-red-600 truncate max-w-xs" title={error}>
          {error}
        </span>
      )}
    </div>
  );

  // Function to render all results in a combined view
  const renderAllResults = () => {
    if (!searchResults) return null;
    
    return Object.keys(searchResults).map(source => {
      const brandColor = pharmacyColors[source] || '#14b8a6';
      const logoSrc = pharmacyLogos[source];
      
      return (
        <div key={source} className="mb-10 animate-fadeIn">
          <h2 className="text-xl font-semibold mb-4 flex items-center" style={{ color: brandColor }}>
            {logoSrc ? (
              <img 
                src={logoSrc} 
                alt={`${source} logo`}
                className="h-6 w-6 mr-3 object-contain"
              />
            ) : (
              <span 
                className="inline-block w-2 h-2 rounded-full mr-2"
                style={{ backgroundColor: brandColor }}
              ></span>
            )}
            {source}
            <Badge variant="outline" className="ml-2" style={{ borderColor: brandColor + '40', color: brandColor }}>
              {searchResults[source]?.length || 0} results
            </Badge>
          </h2>
        {searchResults[source] && searchResults[source].length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults[source].map((product, index) => (
              <ProductCard key={index} product={product} source={source} index={index} />
            ))}
          </div>
        ) : (
          <EmptyState sourceName={source} />
        )}
      </div>
      );
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-teal-50 py-10">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header with Logo */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="/logo.png" 
              alt="Magkano Po Logo" 
              className="h-16 w-16 mr-4 rounded-lg shadow-md"
            />
            <h1 className="text-4xl md:text-5xl font-bold text-teal-700">Magkano Po?</h1>
          </div>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Compare medicine prices across multiple pharmacies to find the best deal for your prescriptions
          </p>
        </div>

        {/* Search Card */}
        <Card className="mb-10 shadow-md border-teal-100">
          <CardContent className="pt-6">
            {/* Search Mode Toggle */}
            <div className="flex justify-center mb-6">
              <div className="flex bg-slate-100 rounded-lg p-1">
                <Button
                  variant={searchMode === 'single' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSearchMode('single')}
                  className={searchMode === 'single' ? 'bg-teal-600 hover:bg-teal-700 text-white' : ''}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Single Item
                </Button>
                <Button
                  variant={searchMode === 'multiple' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSearchMode('multiple')}
                  className={searchMode === 'multiple' ? 'bg-teal-600 hover:bg-teal-700 text-white' : ''}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Multiple Items
                </Button>
              </div>
            </div>

            {/* Single Item Search */}
            {searchMode === 'single' && (
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow">
                  <Textarea
                    placeholder="Enter medicine name (e.g., Paracetamol, Ibuprofen)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="min-h-[80px] pr-10 resize-none border-teal-200 focus-visible:ring-teal-500"
                  />
                  <div className="absolute right-3 top-3 text-teal-300">
                    <Search size={20} />
                  </div>
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={isLoading || !searchQuery.trim()}
                  className="bg-teal-600 hover:bg-teal-700 text-white h-auto py-3"
                >
                  {isLoading ? "Searching..." : "Search Pharmacies"}
                </Button>
              </div>
            )}

            {/* Multiple Item Search */}
            {searchMode === 'multiple' && (
              <div className="space-y-6">
                {/* File Upload Section */}
                <div className="border-2 border-dashed border-teal-200 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="h-12 w-12 text-teal-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-700 mb-2">Upload File</h3>
                    <p className="text-sm text-slate-500 mb-4">
                      Upload a CSV or Excel file with medicine names in the first column
                    </p>
                    <div className="space-y-3">
                      <div className="flex justify-center space-x-3">
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="file-upload"
                        />
                        <label
                          htmlFor="file-upload"
                          className="inline-flex items-center px-4 py-2 border border-teal-300 rounded-md shadow-sm text-sm font-medium text-teal-700 bg-white hover:bg-teal-50 cursor-pointer"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Choose File
                        </label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadTemplate}
                          className="border-slate-300 text-slate-600 hover:bg-slate-50"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Template
                        </Button>
                      </div>
                      <p className="text-xs text-slate-400">
                        Need help? Download the template to see the expected format
                      </p>
                    </div>
                  </div>
                </div>

                {/* File Preview */}
                {previewItems.length > 0 && (
                  <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-amber-800">
                          File Preview ({previewItems.length} items)
                        </h4>
                        <div className="space-x-2">
                          <Button
                            size="sm"
                            onClick={confirmFileUpload}
                            className="bg-teal-600 hover:bg-teal-700 text-white"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelFileUpload}
                            className="border-amber-300 text-amber-700"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {previewItems.slice(0, 20).map((item, index) => (
                            <div key={index} className="bg-white p-2 rounded border border-amber-200 text-sm">
                              {item}
                            </div>
                          ))}
                          {previewItems.length > 20 && (
                            <div className="bg-white p-2 rounded border border-amber-200 text-sm text-slate-500">
                              +{previewItems.length - 20} more items...
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Manual Item Addition */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <h4 className="font-medium text-slate-700 mb-3">Add Items Manually</h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter medicine name..."
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addManualItem()}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    <Button
                      onClick={addManualItem}
                      disabled={!newItemName.trim()}
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Items List */}
                {multipleItems.length > 0 && (
                  <Card className="bg-slate-50 border-slate-200">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-slate-700">
                          Items to Search ({multipleItems.length})
                        </h4>
                        <div className="space-x-2">
                          {!isMultipleSearchRunning ? (
                            <Button
                              onClick={startMultipleSearch}
                              disabled={multipleItems.length === 0}
                              className="bg-teal-600 hover:bg-teal-700 text-white"
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Start Search
                            </Button>
                          ) : (
                            <Button
                              onClick={handleCancelClick}
                              variant="destructive"
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              <Square className="h-4 w-4 mr-2" />
                              Cancel Search
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        <div className="space-y-2">
                          {multipleItems.map((item, index) => (
                            <div key={index} className="flex items-center justify-between bg-white p-3 rounded border border-slate-200">
                              <span className="text-sm">{item}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeItem(index)}
                                disabled={isMultipleSearchRunning}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Multiple Search Progress */}
                {multipleSearchProgress && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          {(() => {
                            const completedItems = multipleSearchProgress.items.filter(item => item.status === 'completed').length;
                            // const cancelledItems = multipleSearchProgress.items.filter(item => item.status === 'cancelled').length;
                            const totalItems = multipleSearchProgress.totalItems;
                            const isCompleted = multipleSearchProgress.status === 'completed';
                            const isCancelled = multipleSearchProgress.status === 'cancelled';
                            
                            return (
                              <>
                                <h4 className="font-medium text-blue-800">
                                  {isCompleted ? 'Search Completed' : isCancelled ? 'Search Cancelled' : 'Search in Progress'}
                                </h4>
                                <div className="text-sm text-blue-700 mt-1">
                                  {isCompleted && (
                                    <span>All {totalItems} items completed successfully</span>
                                  )}
                                  {isCancelled && (
                                    <span>{completedItems} of {totalItems} items completed before cancellation</span>
                                  )}
                                  {!isCompleted && !isCancelled && (
                                    <span>
                                      {completedItems} of {totalItems} items completed
                                      {multipleSearchProgress.status === 'running' && (
                                        <span> • Currently searching item {multipleSearchProgress.currentItem + 1}</span>
                                      )}
                                    </span>
                                  )}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                        {/* Show Export button if there are any completed items, regardless of overall status */}
                        {multipleSearchProgress.items.some(item => item.status === 'completed' && item.results) && (
                          <Button
                            size="sm"
                            onClick={exportMultipleResults}
                            className="bg-teal-600 hover:bg-teal-700 text-white"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export Results
                          </Button>
                        )}
                      </div>
                      <div className="space-y-4">
                        {(() => {
                          const completedItems = multipleSearchProgress.items.filter(item => item.status === 'completed').length;
                          const totalItems = multipleSearchProgress.totalItems;
                          const progressPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
                          
                          return (
                            <Progress 
                              value={progressPercentage} 
                              className="h-3"
                            />
                          );
                        })()}
                        
                        {/* Grid layout for progress items */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {multipleSearchProgress.items.map((item) => (
                            <Card key={item.id} className="bg-white border border-blue-200 shadow-sm">
                              <CardContent className="p-4">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h5 className="font-medium text-slate-800 truncate pr-2">{item.name}</h5>
                                    <div className="flex-shrink-0">
                                      {item.status === 'pending' && (
                                        <Badge variant="outline" className="bg-slate-100 text-slate-600 text-xs">
                                          Pending
                                        </Badge>
                                      )}
                                      {item.status === 'searching' && (
                                        <Badge variant="outline" className="bg-blue-100 text-blue-600 text-xs">
                                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                          Searching...
                                        </Badge>
                                      )}
                                      {item.status === 'completed' && (
                                        <Badge variant="outline" className="bg-green-100 text-green-600 text-xs">
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          Completed
                                        </Badge>
                                      )}
                                      {item.status === 'cancelled' && (
                                        <Badge variant="outline" className="bg-red-100 text-red-600 text-xs">
                                          <XCircle className="h-3 w-3 mr-1" />
                                          Cancelled
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Show pharmacy results if completed */}
                                  {item.status === 'completed' && item.results && (
                                    <div className="space-y-2">
                                      <div className="flex flex-wrap gap-1">
                                        {/* Show all pharmacy results, including those with 0 products */}
                                        {pharmacySources.map(pharmacy => {
                                          const products = item.results?.[pharmacy] || [];
                                          const hasError = item.errors?.[pharmacy];
                                          
                                          if (hasError) {
                                            // Show failed pharmacies in red
                                            return (
                                              <Badge 
                                                key={pharmacy} 
                                                variant="outline" 
                                                className="text-xs bg-red-50 text-red-700 border-red-300"
                                              >
                                                {pharmacy}: Failed
                                              </Badge>
                                            );
                                          } else if (products.length > 0) {
                                            // Show successful pharmacies with results
                                            return (
                                              <Badge 
                                                key={pharmacy} 
                                                variant="secondary" 
                                                className="text-xs"
                                                style={{ 
                                                  backgroundColor: pharmacyColors[pharmacy] + '20',
                                                  color: pharmacyColors[pharmacy] || '#14b8a6',
                                                  border: `1px solid ${pharmacyColors[pharmacy] || '#14b8a6'}40`
                                                }}
                                              >
                                                {pharmacy}: {products.length}
                                              </Badge>
                                            );
                                          } else {
                                            // Show pharmacies with 0 results
                                            return (
                                              <Badge 
                                                key={pharmacy} 
                                                variant="outline" 
                                                className="text-xs bg-amber-50 text-amber-700 border-amber-300"
                                              >
                                                {pharmacy}: 0
                                              </Badge>
                                            );
                                          }
                                        })}
                                      </div>
                                      {Object.values(item.results).every(products => products.length === 0) && (
                                        <div className="text-xs text-slate-600 mt-1">
                                          No results found in any pharmacy
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Show errors if any */}
                                  {item.errors && Object.keys(item.errors).length > 0 && (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-300">
                                          Some sources failed
                                        </Badge>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => refreshItemPharmacies(item.id, item.name)}
                                          disabled={refreshingItems.has(item.id)}
                                          className="h-6 px-2 text-xs border-red-300 text-red-700 hover:bg-red-50"
                                        >
                                          {refreshingItems.has(item.id) ? (
                                            <>
                                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                              Refreshing...
                                            </>
                                          ) : (
                                            <>
                                              <RotateCcw className="h-3 w-3 mr-1" />
                                              Retry Failed
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                      <div className="text-xs text-red-600">
                                        Failed: {Object.keys(item.errors).join(', ')}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {searchMode === 'single' && (
              <p className="text-xs text-slate-500 mt-2">Press Enter to search or use the button</p>
            )}
          </CardContent>
        </Card>

        {/* Pharmacy Status Grid - Show during and after search for single mode only */}
        {searchMode === 'single' && (isLoading || hasSearched) && <PharmacyStatusGrid />}

        {/* Single Search Mode Content */}
        {searchMode === 'single' && (
          <>
            {/* Loading Animation */}
            {isLoading && <LoadingSpinner />}

            {/* Empty state when no search has been performed */}
            {!isLoading && !hasSearched && (
              <div className="text-center py-16">
                <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-teal-100 mb-4">
                  <Search className="h-8 w-8 text-teal-600" />
                </div>
                <h3 className="text-xl font-medium text-slate-700 mb-2">Ready to search</h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  Enter a medicine name above to compare prices across multiple pharmacies
                </p>
              </div>
            )}

            {/* Error Alert */}
            {!isLoading && apiResponse?.status === "error" && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <div className="font-medium mb-2">{apiResponse.message}</div>
                  {apiResponse.message.includes("Network error") && (
                    <div className="text-sm">
                      <p>Possible solutions:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Make sure the backend server is running on port 3000</li>
                        <li>Check your internet connection</li>
                        <li>Try refreshing the page</li>
                        <li>Run the backend using: <code className="bg-red-100 px-1 rounded">npm run dev</code> in the backend folder</li>
                      </ul>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Partial Success Alert with Source Status */}
            {!isLoading && apiResponse?.errors && Object.keys(apiResponse.errors || {}).length > 0 && (
              <Alert className="mb-6 border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <div className="mb-2">
                    Some pharmacies couldn't be searched. Results shown are from available sources.
                  </div>
                  <div className="space-y-1">
                    {Object.entries(apiResponse.errors || {}).map(([source, error]) => (
                      <SourceStatus key={source} source={source} hasData={false} error={error} />
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* No results found */}
            {!isLoading && hasSearched && (!searchResults || Object.keys(searchResults).length === 0) && !apiResponse?.errors && (
              <div className="text-center py-16 animate-fadeIn">
                <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-amber-100 mb-4">
                  <Search className="h-8 w-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-medium text-slate-700 mb-2">No results found</h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  We couldn't find any results for "{searchQuery}". Please try a different search term.
                </p>
              </div>
            )}

            {/* Search Results Display */}
            {!isLoading && searchResults && Object.keys(searchResults || {}).length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 animate-fadeIn">
            {/* Results Summary */}
            {apiResponse?.summary && (
              <div className="mb-6 p-4 bg-teal-50 rounded-lg border border-teal-100">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-teal-800 mb-1">Search Summary</h3>
                    <p className="text-teal-700">
                      Found <strong>{apiResponse.summary.totalProducts}</strong> products from{' '}
                      <strong>{apiResponse.summary.successfulSources}</strong> pharmacies
                      {apiResponse.summary.failedSources > 0 && (
                        <span className="text-amber-700">
                          {' '}({apiResponse.summary.failedSources} sources unavailable)
                        </span>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="bg-teal-600 hover:bg-teal-700 text-white border-teal-600"
                    onClick={() => exportToExcel(searchResults)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Results
                  </Button>
                </div>
              </div>
            )}

            {/* Tabs for sources */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList className="mb-6 bg-slate-100 p-1 overflow-x-auto flex w-full justify-start space-x-1">
                <TabsTrigger
                  value="all"
                  className="data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm"
                >
                  All Sources
                </TabsTrigger>
                {Object.keys(searchResults || {}).map((source) => {
                  const logoSrc = pharmacyLogos[source];
                  
                  return (
                    <TabsTrigger
                      key={source}
                      value={source}
                      className="data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm whitespace-nowrap"
                    >
                      <div className="flex items-center">
                        {logoSrc && (
                          <img 
                            src={logoSrc} 
                            alt={`${source} logo`}
                            className="h-4 w-4 mr-1.5 object-contain"
                          />
                        )}
                        {source}
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {searchResults[source] ? searchResults[source].length : 0}
                        </Badge>
                      </div>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <TabsContent value="all" className="mt-0">
                {renderAllResults()}
              </TabsContent>

              {Object.keys(searchResults || {}).map((source) => {
                const brandColor = pharmacyColors[source] || '#14b8a6';
                const logoSrc = pharmacyLogos[source];
                
                return (
                  <TabsContent key={source} value={source} className="mt-0 animate-fadeIn">
                    <h2 className="text-xl font-semibold mb-4 flex items-center" style={{ color: brandColor }}>
                      {logoSrc ? (
                        <img 
                          src={logoSrc} 
                          alt={`${source} logo`}
                          className="h-6 w-6 mr-3 object-contain"
                        />
                      ) : (
                        <span 
                          className="inline-block w-2 h-2 rounded-full mr-2"
                          style={{ backgroundColor: brandColor }}
                        ></span>
                      )}
                      {source}
                      <Badge variant="outline" className="ml-2" style={{ borderColor: brandColor + '40', color: brandColor }}>
                        {searchResults[source]?.length || 0} results
                      </Badge>
                    </h2>
                  {searchResults[source] && searchResults[source].length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {searchResults[source].map((product, index) => (
                        <ProductCard key={index} product={product} source={source} index={index} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState sourceName={source} />
                  )}
                </TabsContent>
                );
              })}
            </Tabs>
          </div>
        )}
        </>
        )}

        {/* Multiple Search Mode Content */}
        {searchMode === 'multiple' && !multipleItems.length && !multipleSearchProgress && (
          <div className="text-center py-16">
            <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-teal-100 mb-4">
              <FileText className="h-8 w-8 text-teal-600" />
            </div>
            <h3 className="text-xl font-medium text-slate-700 mb-2">Ready for multiple search</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Upload a file or add items manually to start searching for multiple medicines at once
            </p>
          </div>
        )}
        {/* Cancel Search Confirmation Dialog */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Search?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel the search? Any completed results will be preserved, 
                but the remaining items will not be searched.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelCancel}>
                Continue Searching
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleCancelConfirm}
                className="bg-red-600 hover:bg-red-700"
              >
                Yes, Cancel Search
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default App;
