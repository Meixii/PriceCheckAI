import { useState, type KeyboardEvent, useEffect } from 'react';
import { Search, Pill, PackageX, AlertTriangle, CheckCircle, XCircle, Download, Loader2, RotateCcw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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
            <p className="text-xs text-slate-500 mt-2">Press Enter to search or use the button</p>
          </CardContent>
        </Card>

        {/* Pharmacy Status Grid - Show during and after search */}
        {(isLoading || hasSearched) && <PharmacyStatusGrid />}

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
      </div>
    </div>
  );
}

export default App;
