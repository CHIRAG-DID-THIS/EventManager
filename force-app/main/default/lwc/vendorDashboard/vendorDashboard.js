import { LightningElement, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CurrentPageReference } from 'lightning/navigation';
import { refreshApex } from '@salesforce/apex';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import VENUE_DESCRIPTION_FIELD from '@salesforce/schema/Venue__c.Descriptions__c';
import getVenueById from '@salesforce/apex/VendorDashboardController.getVenueById';
// Apex Methods
import getCompanyDetails from '@salesforce/apex/VendorDashboardController.getCompanyDetails';
import searchVenues from '@salesforce/apex/VendorDashboardController.searchVenues';
import createVenue from '@salesforce/apex/VendorDashboardController.createVenue';
import linkVenueToPlanner from '@salesforce/apex/VendorDashboardController.linkVenueToPlanner';
import getVendorVenues from '@salesforce/apex/VendorDashboardController.getVendorVenues';
import getServicePicklistValues from '@salesforce/apex/VendorDashboardController.getServicePicklistValues';
import createService from '@salesforce/apex/VendorDashboardController.createService';
import getVendorServices from '@salesforce/apex/VendorDashboardController.getVendorServices';
import setUnavailability from '@salesforce/apex/VendorDashboardController.setUnavailability';
import getUpcomingBookings from '@salesforce/apex/VendorDashboardController.getUpcomingBookings';
import updateVenueDescription from '@salesforce/apex/VenueImageManager.updateVenueDescription';
import linkUploadedFiles from '@salesforce/apex/VenueImageManager.linkUploadedFiles';

const VENUE_COLUMNS = [
    { label: 'Venue Name', fieldName: 'VenueName' },
    { label: 'Location', fieldName: 'VenueLocation' },
    { label: 'Capacity', fieldName: 'VenueCapacity' },
    { label: 'Price', fieldName: 'VenuePrice' },
    {
        label: 'View',
        type: 'button',
        typeAttributes: {
            label: 'View',
            name: 'view_details',
            variant: 'neutral',
            iconName: 'utility:preview',
            iconPosition: 'left'
        },
        initialWidth: 100
    },
    {
        label: 'Images',
        type: 'button',
        typeAttributes: {
            label: 'Add',
            name: 'add_images',
            variant: 'brand-outline',
            iconName: 'utility:image',
            iconPosition: 'left'
        },
        initialWidth: 110
    }
];

const SERVICE_COLUMNS = [
    { label: 'Service Type', fieldName: 'Service_Type__c' },
    { label: 'Sub-Type', fieldName: 'Service_SubType__c' },
    { label: 'Price', fieldName: 'Price__c', type: 'currency', cellAttributes: { alignment: 'left' } }
];

// Dependent picklist mapping based on Service Type to Service Subtype
const SERVICE_DEPENDENCY_MAP = {
    'Catering': [
        'Veg Buffet',
        'Non-Veg Buffet',
        'Drinks & Refreshments'
    ],
    'Decoration': [
        'Floral Decor',
        'Lighting Decor',
        'Theme Decor'
    ],
    'Entertainment': [
            'Stage & Show(Magic show, Puppet Show, etc.. )',
            'Special Attraction (Anchor, Celebrities, Fireworks, etc.. )',
            'Music & Performance (Live Band, DJ, Dance Troop etc.. )'
        ],
    'Security': [
        'VIP Security',
        'Standard Security'
    ],
    'Transport': [
        'Guest Transport',
        'Special Transport (Helicopter Entry, Yatch, etc...)'
    ]
};

export default class VendorDashboard extends LightningElement {
    @track companyId;
    @track companyName = '';
    @track companyDetails = {}; // Object to hold all company details
    @track error;
    
    // Tab management
    @track activeTab = 'company';

    // --- VENUE MANAGEMENT ---
    @track venueSearchTerm = '';
    @track venueSearchResults = [];
    @track selectedVenueId = '';
    @track selectedVenueDetails = {};
    @track plannerVenuePrice;
    
    @track isNewVenueModalOpen = false;
    @track newVenue = {};
    @track vendorVenues = [];
    @track venueSearchData = []; // Store full venue data for auto-fill
    @track showSearchResults = false;
    @track showNoResults = false; // Control dropdown visibility
    venueColumns = VENUE_COLUMNS;
    wiredVenuesResult;
    @track isVenueDetailsOpen = false; // Modal state for viewing venue details
    @track selectedVenueId = '';

    // --- IMAGE UPLOAD MANAGEMENT ---
    @track isImageUploadModalOpen = false;
    @track selectedVenueForImages = null;
    @track uploadedFiles = [];

    // --- SERVICE MANAGEMENT ---
    @track serviceTypeOptions = [];
    @track serviceSubTypeOptions = [];
    @track allServiceSubTypes = [];
    @track selectedServiceType = '';
    
    // Getter for Service Sub-Type disabled state
    get isServiceSubTypeDisabled() {
        return !this.selectedServiceType;
    }
    @track newService = {};
    @track vendorServices = [];
    @track isNewServiceModalOpen = false; // Missing modal state property
    serviceColumns = SERVICE_COLUMNS;
    wiredServicesResult;
    
    // --- AVAILABILITY MANAGEMENT ---
    @track isUnavailabilityModalOpen = false;
    @track unavailabilityData = {};
    @track selectedVenueForUnavailability;

    // --- UPCOMING BOOKINGS ---
    @track upcomingBookings = [];
    // Derived bookings with parsed services and vendor payout
    get upcomingBookingsDisplay() {
        const src = Array.isArray(this.upcomingBookings) ? this.upcomingBookings : [];
        return src.map(b => {
            let parsed = [];
            try {
                const raw = b?.Package__r?.Services__c;
                parsed = raw ? JSON.parse(raw) : [];
            } catch (e) {
                // Fallback to empty array if parsing fails
                parsed = [];
                // Optional: log parse error for debugging
                // console.warn('Failed to parse booking services JSON', e);
            }
            
            // Use Total_Amount__c from Booking__c, fallback to Package TotalCost__c
            const total = b?.Total_Amount__c || b?.Package__r?.TotalCost__c || 0;
            const vendorPayout = total * 0.9;
            
            // Format dates from Booking__c fields
            const formatDate = (dateStr) => {
                if (!dateStr) return 'N/A';
                try {
                    return new Date(dateStr).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                } catch (e) {
                    return 'Invalid Date';
                }
            };
            
            return {
                ...b,
                _services: parsed,
                _vendorPayout: vendorPayout,
                _formattedStartDate: formatDate(b?.EventDate__c),
                _formattedEndDate: formatDate(b?.Event_End_Date__c)
            };
        });
    }

    // --- GETTERS ---
    get greeting() {
        return this.companyName ? `Welcome, ${this.companyName}!` : 'Loading...';
    }

    get isUploadButtonDisabled() {
        return this.uploadedFiles.length === 0;
    }

   get uploadedFilesPlural() {
        return this.uploadedFiles.length === 1 ? '' : 's';
    }
    
    // KPI metrics for header
    get venueCount() {
        return Array.isArray(this.vendorVenues) ? this.vendorVenues.length : 0;
    }
    get serviceCount() {
        return Array.isArray(this.vendorServices) ? this.vendorServices.length : 0;
    }
    get bookingCount() {
        return Array.isArray(this.upcomingBookings) ? this.upcomingBookings.length : 0;
    }
    
    // --- WIRE SERVICES ---KPI metrics for header
    get venueCount() {
        return Array.isArray(this.vendorVenues) ? this.vendorVenues.length : 0;
    }
    get serviceCount() {
        return Array.isArray(this.vendorServices) ? this.vendorServices.length : 0;
    }
    get bookingCount() {
        return Array.isArray(this.upcomingBookings) ? this.upcomingBookings.length : 0;
    }
    
    // --- WIRE SERVICES ---
    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        console.log('=== PAGE REFERENCE DEBUG ===');
        console.log('Current page reference:', currentPageReference);
        if (currentPageReference) {
            console.log('Page reference state:', currentPageReference.state);
            this.companyId = currentPageReference.state.companyId;
            console.log('Company ID set to:', this.companyId);
        }
    }

    @wire(getCompanyDetails, { companyId: '$companyId' })
    wiredCompany({ error, data }) {
        console.log('=== COMPANY DETAILS DEBUG ===');
        console.log('Company ID:', this.companyId);
        console.log('Raw company data:', data);
        console.log('Company error:', error);
        
        if (data) {
            this.companyName = data.Company_Name__c;
            this.companyDetails = {
                Company_Name__c: data.Company_Name__c || '',
                Phone__c: data.Phone__c || '',
                Address__c: data.Address__c || '',
                City__c: data.City__c || '',
                CompanyRegNo__c: data.CompanyRegNo__c || '',
                EventType__c: data.EventType__c || '',
                About__c: data.About__c || '',
                BankingInfo__c: data.BankingInfo__c || '',
                Unavailable__c: data.Unavailable__c || false
            };
            console.log('Processed company details:', this.companyDetails);
        } else if (error) {
            this.showToast('Error fetching company', 'Could not load company details.', 'error');
            console.error('Company details error:', error);
        }
    }

    // --- UPDATED to pass companyId ---
    @wire(getVendorVenues, { companyId: '$companyId' })
    wiredVendorVenues(result) {
        console.log('=== VENUES DEBUG ===');
        console.log('Company ID for venues:', this.companyId);
        console.log('Raw venues result:', result);
        console.log('Venues data:', result.data);
        console.log('Venues error:', result.error);
        
        this.wiredVenuesResult = result;
        if (result.data) {
            console.log('Sample venue item before mapping:', result.data[0]);
            this.vendorVenues = result.data.map(plannerVenue => ({
                ...plannerVenue,
                VenueId: plannerVenue.Venue__r?.Id || plannerVenue.Id, // Use actual Venue__c ID for image uploads
                VenueName: plannerVenue.Venue__r?.VenueName__c || 'N/A',
                VenueLocation: plannerVenue.Venue__r?.Location__c || 'N/A',
                VenueCapacity: plannerVenue.Venue__r?.Capacity__c || 'N/A',
                VenueDescription: plannerVenue.Venue__r?.Descriptions__c || '',
                VenuePrice: plannerVenue.Price__c || 'Contact for pricing',
                // Company information from EventComapny__r
                CompanyName: plannerVenue.EventComapny__r?.Company_Name__c,
                CompanyAddress: plannerVenue.EventComapny__r?.Address__c,
                CompanyCity: plannerVenue.EventComapny__r?.City__c,
                Phone__c: plannerVenue.EventComapny__r?.Phone__c,
                EventType__c: plannerVenue.EventComapny__r?.EventType__c,
                About__c: plannerVenue.EventComapny__r?.About__c,
                Unavailable__c: plannerVenue.EventComapny__r?.Unavailable__c,
                BankingInfo__c: plannerVenue.EventComapny__r?.BankingInfo__c,
                CompanyRegNo__c: plannerVenue.EventComapny__r?.CompanyRegNo__c,
                // Also keep the original field names for compatibility
                VenueName__c: plannerVenue.Venue__r?.VenueName__c,
                Location__c: plannerVenue.Venue__r?.Location__c,
                City__c: plannerVenue.Venue__r?.City__c
            }));
            console.log('Processed venues:', this.vendorVenues);
            console.log('Sample processed venue:', this.vendorVenues[0]);
        } else if (result.error) {
            this.showToast('Data Load Error', 'Could not load your venues.', 'error');
            console.error('Venues error:', result.error);
        }
    }

    // --- UPDATED to pass companyId ---
    @wire(getVendorServices, { companyId: '$companyId' })
    wiredVendorServices(result) {
        console.log('=== SERVICES DEBUG ===');
        console.log('Company ID for services:', this.companyId);
        console.log('Raw services result:', result);
        console.log('Services data:', result.data);
        console.log('Services error:', result.error);
        
        this.wiredServicesResult = result;
        if (result.data) {
            console.log('Sample service item before mapping:', result.data[0]);
            this.vendorServices = result.data.map(item => ({
                ...item,
                // Ensure proper field mapping for template
                ServiceType__c: item.ServiceType__c || item.Service_Type__c,
                ServiceSubType__c: item.ServiceSubType__c || item.Service_SubType__c,
                PricePerUnit__c: item.PricePerUnit__c || item.Price__c,
                Description__c: item.Description__c || item.Description || ''
            }));
            console.log('Services loaded:', this.vendorServices);
            console.log('Sample processed service:', this.vendorServices[0]);
        } else if (result.error) {
            this.showToast('Data Load Error', 'Could not load your services.', 'error');
            console.error('Services error:', result.error);
        }
    }

    // --- UPDATED to pass companyId ---
    @wire(getUpcomingBookings, { companyId: '$companyId' })
    wiredBookings({ error, data }) {
        if (data) {
            this.upcomingBookings = data;
        } else if (error) {
            this.showToast('Data Load Error', 'Could not load upcoming bookings.', 'error');
        }
    }

    @wire(getServicePicklistValues)
    wiredServicePicklists({ error, data }) {
        if (data) {
            console.log('=== PICKLIST VALUES DEBUG ===');
            console.log('Raw data from Apex:', data);
            console.log('Service Types from Salesforce:', data.Service_Type__c);
            console.log('Service Sub-Types from Salesforce:', data.Service_SubType__c_All);
            
            this.serviceTypeOptions = data.Service_Type__c.map(val => ({ label: val, value: val }));
            this.allServiceSubTypes = data.Service_SubType__c_All.map(val => ({ label: val, value: val }));
            this.serviceSubTypeOptions = this.allServiceSubTypes;
            
            console.log('Processed serviceTypeOptions:', this.serviceTypeOptions);
            console.log('SERVICE_DEPENDENCY_MAP keys:', Object.keys(this.SERVICE_DEPENDENCY_MAP));
        } else if (error) {
            console.error('Error loading picklist values:', error);
        }
    }

    // Fetch selected venue rich text description (supports embedded images)
    @wire(getRecord, { recordId: '$selectedVenueId', fields: [VENUE_DESCRIPTION_FIELD] })
    wiredVenueRecord({ data, error }) {
        if (data) {
            this.selectedVenueDescriptionHtml = getFieldValue(data, VENUE_DESCRIPTION_FIELD) || '';
        } else {
            this.selectedVenueDescriptionHtml = '';
        }
    }

    // Mirror venueDetails: also fetch via Apex to ensure consistent rendering permissions/data
    @wire(getVenueById, { venueId: '$selectedVenueId' })
    wiredSelectedVenue({ data, error }) {
        if (data) {
            // Prefer Apex-fetched HTML if present
            this.selectedVenueDescriptionHtml = data.Descriptions__c || this.selectedVenueDescriptionHtml || '';
        }
    }

    // --- VENUE HANDLERS ---
    handleVenueSearchInput(event) {
        const searchTerm = event.target.value;
        this.venueSearchTerm = searchTerm;
        
        console.log('Search term:', searchTerm);
        console.log('Search term length:', searchTerm.length);
        
        if (searchTerm.length < 2) {
            console.log('Search term too short, clearing search');
            this.clearVenueSearch();
            return;
        }
        
        console.log('Calling searchVenues with term:', searchTerm);
        searchVenues({ searchTerm: searchTerm })
            .then(result => {
                console.log('Search result:', result);
                console.log('Number of venues found:', result.length);
                
                // Store full venue data for auto-fill
                this.venueSearchData = result;
                
                // Map to dropdown options
                this.venueSearchResults = result.map(venue => ({
                    label: `${venue.VenueName__c} - ${venue.Location__c}${venue.Capacity__c ? ' (Capacity: ' + venue.Capacity__c + ')' : ''}`,
                    value: venue.Id
                }));
                
                console.log('Venue search results:', this.venueSearchResults);
                
                // Show dropdown if we have results, show no results if we searched but found nothing
                if (this.venueSearchResults.length > 0) {
                    this.showSearchResults = true;
                    this.showNoResults = false;
                } else {
                    this.showSearchResults = false;
                    this.showNoResults = true;
                }
                
                console.log('Show search results:', this.showSearchResults);
                console.log('showNoResults:', this.showNoResults);
            })
            .catch(error => {
                console.error('Venue search error:', error);
                this.showToast('Search Error', 'Venue search failed. Please try again.', 'error');
                this.showSearchResults = false;
                this.showNoResults = false;
            });
    }

    handleVenueSelectFromDropdown(event) {
        const venueId = event.currentTarget.dataset.venueId;
        this.selectedVenueId = venueId;
        
        // Auto-fill venue details when a venue is selected
        if (this.selectedVenueId && this.venueSearchData.length > 0) {
            const selectedVenue = this.venueSearchData.find(venue => venue.Id === this.selectedVenueId);
            if (selectedVenue) {
                this.selectedVenueDetails = {
                    name: selectedVenue.VenueName__c,
                    location: selectedVenue.Location__c,
                    capacity: selectedVenue.Capacity__c,
                    description: selectedVenue.Descriptions__c
                };
                // Also set rich text HTML for rendering (images supported)
                this.selectedVenueDescriptionHtml = selectedVenue.Descriptions__c || '';
                
                // Update search term to show selected venue name
                this.venueSearchTerm = selectedVenue.VenueName__c;
            }
        } else {
            this.selectedVenueDetails = {};
            this.selectedVenueDescriptionHtml = '';
        }
        
        // Hide dropdown after selection
        this.showSearchResults = false;
    }

    clearVenueSearch() {
        this.venueSearchResults = [];
        this.venueSearchData = [];
        this.selectedVenueId = '';
        this.selectedVenueDetails = null;
        this.selectedVenueDescriptionHtml = '';
        this.showSearchResults = false;
        this.showNoResults = false;
    }

    // Handle clicks outside dropdown to close it
    connectedCallback() {
        console.log('=== COMPONENT INITIALIZATION ===');
        console.log('Component connected, companyId:', this.companyId);
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
        document.addEventListener('click', this.handleDocumentClick);
    }

    disconnectedCallback() {
        document.removeEventListener('click', this.handleDocumentClick);
    }

    handleDocumentClick(event) {
        const searchContainer = this.template.querySelector('.slds-combobox_container');
        if (searchContainer && !searchContainer.contains(event.target)) {
            this.showSearchResults = false;
            this.showNoResults = false;
        }
    }

    handlePriceChange(event) {
        this.plannerVenuePrice = event.target.value;
    }

    linkVenue() {
        if (!this.companyId || !this.selectedVenueId || !this.plannerVenuePrice) {
            this.showToast('Input Required', 'Please select a venue and enter a price.', 'warning');
            return;
        }
        
        const venueName = this.selectedVenueDetails.name || 'Selected venue';
        
        linkVenueToPlanner({ 
            companyId: this.companyId, 
            venueId: this.selectedVenueId, 
            price: this.plannerVenuePrice 
        })
            .then(() => {
                this.showToast('Success!', `${venueName} has been added to your profile.`, 'success');
                // Clear all venue selection data
                this.selectedVenueId = '';
                this.selectedVenueDetails = {};
                this.selectedVenueDescriptionHtml = '';
                this.plannerVenuePrice = null;
                this.venueSearchResults = [];
                this.venueSearchData = [];
                this.venueSearchTerm = '';
                this.showSearchResults = false;
                // Close the modal
                this.isNewVenueModalOpen = false;
                
                return refreshApex(this.wiredVenuesResult);
            })
            .catch(error => {
                console.error('Error linking venue:', error);
                this.showToast('Error Adding Venue', error.body?.message || 'An error occurred while adding the venue.', 'error');
            });
    }

    // --- VENUE ROW ACTIONS ---
    handleVenueRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        
        if (actionName === 'add_images') {
            this.selectedVenueForImages = row;
            this.isImageUploadModalOpen = true;
        } else if (actionName === 'view_details') {
            // Open the venue details modal using the selected row's VenueId
            this.selectedVenueId = row.VenueId;
            this.isVenueDetailsOpen = true;
        }
    }

    // --- IMAGE UPLOAD MODAL ---
    openImageUploadModal() { this.isImageUploadModalOpen = true; }
    closeImageUploadModal() { 
        this.isImageUploadModalOpen = false; 
        this.selectedVenueForImages = null;
        this.uploadedFiles = [];
    }

    // --- VENUE DETAILS MODAL ---
    closeVenueDetails() {
        this.isVenueDetailsOpen = false;
    }

    handleUploadFinished(event) {
        this.uploadedFiles = event.detail.files;
        this.showToast('Success!', `${this.uploadedFiles.length} file(s) uploaded successfully.`, 'success');
    }

    saveImagesToDescription() {
        if (!this.selectedVenueForImages || this.uploadedFiles.length === 0) {
            this.showToast('Error', 'No venue selected or no files uploaded.', 'error');
            return;
        }

        // Call Apex method to process images and update description
        this.processUploadedImages();
    }

    processUploadedImages() {
        const fileIds = this.uploadedFiles.map(file => file.documentId);
        const imageCount = this.uploadedFiles.length;
        const venueName = this.selectedVenueForImages.VenueName;
        
        // Update primary and gallery IDs, and append images to description
        Promise.all([
            linkUploadedFiles({ contentDocIds: fileIds, venueId: this.selectedVenueForImages.VenueId }),
            updateVenueDescription({ venueId: this.selectedVenueForImages.VenueId, uploadedFileIds: fileIds })
        ])
        .then(() => {
            const successMessage = imageCount === 1 
                ? `1 image has been successfully added to ${venueName}'s description.`
                : `${imageCount} images have been successfully added to ${venueName}'s description.`;
            
            this.showToast('Images Added Successfully!', successMessage, 'success');
            
            // Clear uploaded files and close modal
            this.uploadedFiles = [];
            this.closeImageUploadModal();
            
            return refreshApex(this.wiredVenuesResult);
        })
        .catch(error => {
            console.error('Error processing images:', error);
            const errorMessage = error.body?.message || 'An error occurred while processing images. Please try again.';
            this.showToast('Error Adding Images', errorMessage, 'error');
        });
    }
    
    openNewVenueModal() { this.isNewVenueModalOpen = true; }
    closeNewVenueModal() { this.isNewVenueModalOpen = false; this.newVenue = {}; }

    handleNewVenueChange(event) {
        const field = event.target.name;
        const value = event.target.value.value ? event.target.value.value : event.target.value;
        this.newVenue = { ...this.newVenue, [field]: value };
    }

    saveNewVenueAndLink() {
        if (!this.companyId) {
            this.showToast('Error', 'Company ID is missing. Cannot save.', 'error');
            return;
        }
        const { VenueName__c, Price__c } = this.newVenue;
        if (!VenueName__c || !Price__c) {
            this.showToast('Input Required', 'Venue Name and your Price are required.', 'warning');
            return;
        }
        const venueToCreate = {
            VenueName__c: this.newVenue.VenueName__c,
            Location__c: this.newVenue.Location__c,
            Capacity__c: this.newVenue.Capacity__c,
            Descriptions__c: this.newVenue.Descriptions__c
        };

        createVenue({ newVenue: venueToCreate })
            .then(result => {
                // --- UPDATED to pass companyId ---
                return linkVenueToPlanner({ 
                    companyId: this.companyId, 
                    venueId: result.Id, 
                    price: this.newVenue.Price__c 
                });
            })
            .then(() => {
                this.showToast('Success!', 'New venue created and added.', 'success');
                this.closeNewVenueModal();
                return refreshApex(this.wiredVenuesResult);
            })
            .catch(error => this.showToast('Error Creating Venue', error.body.message, 'error'));
    }

    // --- SERVICE HANDLERS ---
    handleServiceChange(event) {
        const fieldName = event.target.name;
        const fieldValue = event.target.value;
        
        this.newService = {...this.newService, [fieldName]: fieldValue };
        
        // Handle dependent picklist logic for Service Type
        if (fieldName === 'Service_Type__c') {
            this.selectedServiceType = fieldValue;
            
            // Update Service Subtype options based on selected Service Type
            if (fieldValue && SERVICE_DEPENDENCY_MAP[fieldValue]) {
                this.serviceSubTypeOptions = SERVICE_DEPENDENCY_MAP[fieldValue].map(subtype => ({
                    label: subtype,
                    value: subtype
                }));
            } else {
                // If no service type selected or no mapping found, show all subtypes
                this.serviceSubTypeOptions = this.allServiceSubTypes;
            }
            
            // Clear the selected subtype when service type changes
            this.newService = {...this.newService, Service_SubType__c: ''};
            
            // Clear the subtype combobox value in the UI
            const subtypeCombobox = this.template.querySelector('lightning-combobox[name="Service_SubType__c"]');
            if (subtypeCombobox) {
                subtypeCombobox.value = '';
            }
        }
    }

    createService() {
        if (!this.companyId) {
            this.showToast('Error', 'Company ID is missing. Cannot save.', 'error');
            return;
        }
        const { Service_Type__c, Service_SubType__c, Price__c } = this.newService;
        
        console.log('=== CREATE SERVICE DEBUG ===');
        console.log('Company ID:', this.companyId);
        console.log('Service Type:', Service_Type__c);
        console.log('Service Sub-Type:', Service_SubType__c);
        console.log('Price:', Price__c);
        console.log('Full newService object:', this.newService);
        
        if (!Service_Type__c || !Service_SubType__c || !Price__c) {
            this.showToast('Input Required', 'Please fill all service fields.', 'warning');
            return;
        }
        // --- UPDATED to pass companyId ---
        createService({ 
            companyId: this.companyId,
            serviceType: Service_Type__c, 
            serviceSubType: Service_SubType__c, 
            price: Price__c 
        })
        .then(() => {
            this.showToast('Success!', 'Service has been added.', 'success');
            
            // Reset form data
            this.newService = {};
            this.selectedServiceType = '';
            this.serviceSubTypeOptions = this.allServiceSubTypes;
            
            // Close the modal
            this.closeNewServiceModal();
            
            // Reset form UI elements
            this.template.querySelectorAll('select, input, textarea').forEach(element => {
                if(element.name && element.name.includes('Service') || element.name === 'Price__c') {
                    element.value = '';
                }
            });
            
            return refreshApex(this.wiredServicesResult);
        })
        .catch(error => this.showToast('Error Adding Service', error.body.message, 'error'));
    }

    // --- AVAILABILITY HANDLERS ---
    openUnavailabilityModal(event) {
        this.selectedVenueForUnavailability = event.detail;
        this.isUnavailabilityModalOpen = true;
    }

    updateServiceSubTypeOptions() {
        console.log('=== UPDATING SERVICE SUB-TYPE OPTIONS ===');
        console.log('Selected service type:', this.selectedServiceType);
        
        if (this.selectedServiceType && SERVICE_DEPENDENCY_MAP[this.selectedServiceType]) {
            this.serviceSubTypeOptions = SERVICE_DEPENDENCY_MAP[this.selectedServiceType].map(subType => ({
                label: subType,
                value: subType
            }));
        } else {
            this.serviceSubTypeOptions = [];
        }
        console.log('Updated sub-type options:', this.serviceSubTypeOptions);
    }

    closeUnavailabilityModal() {
        this.isUnavailabilityModalOpen = false;
        this.unavailabilityData = {};
    }

    handleUnavailabilityChange(event) {
        this.unavailabilityData = {...this.unavailabilityData, [event.target.name]: event.target.value };
    }
    
    saveUnavailability() {
        const { StartDate__c, EndDate__c } = this.unavailabilityData;
        if (!StartDate__c || !EndDate__c) {
            this.showToast('Input Required', 'Both start and end dates are required.', 'warning');
            return;
        }
        if (StartDate__c > EndDate__c) {
            this.showToast('Invalid Dates', 'End date cannot be before the start date.', 'error');
            return;
        }

        setUnavailability({ 
            venueId: this.selectedVenueForUnavailability, 
            startDate: StartDate__c, 
            endDate: EndDate__c 
        })
        .then(() => {
            this.showToast('Success!', 'Unavailability has been set for the venue.', 'success');
            this.closeUnavailabilityModal();
        })
        .catch(error => this.showToast('Error Setting Unavailability', error.body.message, 'error'));
    }

    // --- UTILITY ---
    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }



    // ===== TAB MANAGEMENT =====
    handleTabClick(event) {
        const tabName = event.target.dataset.tab;
        if (tabName) {
            this.activeTab = tabName;
            
            // Update tab button states
            const tabButtons = this.template.querySelectorAll('.tab-navigation button');
            tabButtons.forEach(button => {
                button.classList.remove('active');
            });
            event.target.classList.add('active');
            
            // Update tab content visibility
            const tabContents = this.template.querySelectorAll('.tab-content > div');
            tabContents.forEach(content => {
                content.classList.remove('active');
            });
            
            const activeContent = this.template.querySelector(`[data-tab-content="${tabName}"]`);
            if (activeContent) {
                activeContent.classList.add('active');
            }
        }
    }

    // ===== MODAL MANAGEMENT =====
    openNewVenueModal() {
        this.isNewVenueModalOpen = true;
        this.newVenue = {};
    }

    closeNewVenueModal() {
        this.isNewVenueModalOpen = false;
        this.newVenue = {};
        // Clear venue search data
        this.clearVenueSearch();
    }

    openVenueDetails(event) {
        const venueId = event.currentTarget.dataset.venueid;
        if (venueId) {
            this.selectedVenueId = venueId;
            this.isVenueDetailsOpen = true;
        }
    }

    openImageUploadModal(event) {
        event.stopPropagation(); // Prevent event bubbling
        const venueId = event.target.dataset.venueid || event.currentTarget.dataset.venueid;
        if (venueId) {
            // Find the full venue object from the venues array
            const venue = this.vendorVenues.find(v => v.VenueId === venueId);
            if (venue) {
                this.selectedVenueForImages = venue;
                this.isImageUploadModalOpen = true;
                this.uploadedFiles = [];
                console.log('Opening image upload modal for venue:', venue.VenueName);
            }
        }
    }

    openUnavailabilityModalFromButton(event) {
        const venueId = event.target.dataset.venueId;
        if (venueId) {
            this.selectedVenueForUnavailability = venueId;
            this.isUnavailabilityModalOpen = true;
            this.unavailabilityData = {};
        }
    }





    // ===== MODAL CLOSE HANDLERS =====
    handleModalClose(event) {
        const modalType = event.target.dataset.modal;
        switch (modalType) {
            case 'newVenue':
                this.closeNewVenueModal();
                break;
            case 'venueDetails':
                this.closeVenueDetails();
                break;
            case 'imageUpload':
                this.closeImageUploadModal();
                break;
            case 'unavailability':
                this.closeUnavailabilityModal();
                break;
            case 'photoGallery':
                this.closePhotoGalleryModal();
                break;
        }
    }

    // ===== FORM HANDLERS =====
    handleFormInput(event) {
        const field = event.target.dataset.field;
        const value = event.target.value;
        
        if (event.target.dataset.form === 'newVenue') {
            this.newVenue = { ...this.newVenue, [field]: value };
        } else if (event.target.dataset.form === 'newService') {
            this.newService = { ...this.newService, [field]: value };
        } else if (event.target.dataset.form === 'unavailability') {
            this.unavailabilityData = { ...this.unavailabilityData, [field]: value };
        }
    }

    // ===== BUTTON HANDLERS =====
    handleButtonClick(event) {
        const action = event.target.dataset.action;
        
        switch (action) {
            case 'saveNewVenue':
                this.saveNewVenueAndLink();
                break;
            case 'linkVenue':
                this.linkVenue();
                break;
            case 'createService':
                this.createService();
                break;
            case 'saveUnavailability':
                this.saveUnavailability();
                break;
            case 'saveImages':
                this.saveImagesToDescription();
                break;
            case 'clearVenueSearch':
                this.clearVenueSearch();
                break;
        }
    }

    // ===== VENUE CARD CLICK HANDLER =====
    handleVenueCardClick(event) {
        const venueId = event.currentTarget.dataset.venueId;
        if (venueId && !event.target.closest('button')) {
            this.selectedVenueId = venueId;
            // Find and display venue details
            const venue = this.vendorVenues.find(v => v.Id === venueId);
            if (venue) {
                this.selectedVenueDetails = venue;
            }
        }
    }

    // ===== SERVICE TYPE CHANGE HANDLER =====
    handleServiceTypeChange(event) {
        const selectedType = event.target.value;
        this.selectedServiceType = selectedType;
        this.newService = { ...this.newService, Service_Type__c: selectedType };
        
        // Update sub-type options based on selection
        if (SERVICE_DEPENDENCY_MAP[selectedType]) {
            this.serviceSubTypeOptions = SERVICE_DEPENDENCY_MAP[selectedType].map(subType => ({
                label: subType,
                value: subType
            }));
        } else {
            this.serviceSubTypeOptions = [];
        }
    }

    // ===== UTILITY METHODS =====
    get isCompanyTabActive() {
        return this.activeTab === 'company';
    }

    get isVenuesTabActive() {
        return this.activeTab === 'venues';
    }

    get isServicesTabActive() {
        return this.activeTab === 'services';
    }

    get isAvailabilityTabActive() {
        return this.activeTab === 'availability';
    }

    get isBookingsTabActive() {
        return this.activeTab === 'bookings';
    }

    get isAnalyticsTabActive() {
        return this.activeTab === 'analytics';
    }

    // ===== TAB BUTTON CLASSES =====
    get companyTabClass() {
        return this.activeTab === 'company' ? 'tab-button active' : 'tab-button';
    }

    get venuesTabClass() {
        return this.activeTab === 'venues' ? 'tab-button active' : 'tab-button';
    }

    get servicesTabClass() {
        return this.activeTab === 'services' ? 'tab-button active' : 'tab-button';
    }

    get availabilityTabClass() {
        return this.activeTab === 'availability' ? 'tab-button active' : 'tab-button';
    }

    get bookingsTabClass() {
        return this.activeTab === 'bookings' ? 'tab-button active' : 'tab-button';
    }

    get analyticsTabClass() {
        return this.activeTab === 'analytics' ? 'tab-button active' : 'tab-button';
    }

    // ===== TAB CONTENT CLASSES =====
    get companyTabContentClass() {
        return this.activeTab === 'company' ? 'tab-pane active' : 'tab-pane';
    }

    get venuesTabContentClass() {
        return this.activeTab === 'venues' ? 'tab-pane active' : 'tab-pane';
    }

    get servicesTabContentClass() {
        return this.activeTab === 'services' ? 'tab-pane active' : 'tab-pane';
    }

    get availabilityTabContentClass() {
        return this.activeTab === 'availability' ? 'tab-pane active' : 'tab-pane';
    }

    get bookingsTabContentClass() {
        return this.activeTab === 'bookings' ? 'tab-pane active' : 'tab-pane';
    }

    get analyticsTabContentClass() {
        return this.activeTab === 'analytics' ? 'tab-pane active' : 'tab-pane';
    }

    // ===== MODAL EVENT HANDLERS =====
    handleModalOverlayClick(event) {
        // Close modal when clicking on overlay (outside modal content)
        if (event.target.classList.contains('modal-overlay')) {
            this.closeAllModals();
        }
    }

    handleModalContentClick(event) {
        // Prevent modal from closing when clicking inside modal content
        event.stopPropagation();
    }

    closeAllModals() {
        this.isNewVenueModalOpen = false;
        this.isVenueDetailsOpen = false;
        this.isImageUploadModalOpen = false;
        this.isUnavailabilityModalOpen = false;
        this.isNewServiceModalOpen = false;
    }

    // ===== FORM CHANGE HANDLERS =====
    handleNewVenueChange(event) {
        const field = event.target.name;
        const value = event.target.value;
        this.newVenue = { ...this.newVenue, [field]: value };
    }

    handleNewServiceChange(event) {
        const field = event.target.name;
        const value = event.target.value;
        console.log('=== SERVICE FORM CHANGE ===');
        console.log('Field:', field, 'Value:', value);
        this.newService = { ...this.newService, [field]: value };
        console.log('Updated newService:', this.newService);
        
        // Handle service type change to update sub-type options
        if (field === 'Service_Type__c') {
            this.selectedServiceType = value;
            this.updateServiceSubTypeOptions();
        }
    }

    handleUnavailabilityChange(event) {
        const field = event.target.name;
        const value = event.target.value;
        this.unavailabilityData = { ...this.unavailabilityData, [field]: value };
    }

    // ===== VENUE SELECTION =====
    selectVenue(event) {
        const venueId = event.currentTarget.dataset.venueid;
        if (venueId) {
            this.selectedVenueId = venueId;
            // Find the venue details
            const venue = this.vendorVenues.find(v => v.VenueId === venueId);
            if (venue) {
                this.selectedVenue = venue;
            }
        }
    }

    // ===== MISSING MODAL METHODS =====
    openNewServiceModal() {
        console.log('=== SERVICE MODAL DEBUG ===');
        console.log('openNewServiceModal called');
        this.isNewServiceModalOpen = true;
        this.newService = {
            ServiceType__c: '',
            ServiceSubType__c: '',
            PricePerUnit__c: '',
            Description__c: ''
        };
        console.log('Service modal opened, isNewServiceModalOpen:', this.isNewServiceModalOpen);
        console.log('New service object:', this.newService);
    }

    closeNewServiceModal() {
        this.isNewServiceModalOpen = false;
        this.newService = {};
    }

    openUnavailabilityModal(event) {
        const venueId = event.target.dataset.venueid;
        if (venueId) {
            this.selectedVenueForUnavailability = venueId;
            this.isUnavailabilityModalOpen = true;
            this.unavailabilityData = {};
        }
    }

    // ===== ANALYTICS METHODS =====
    get analyticsData() {
        const totalRevenue = this.calculateTotalRevenue();
        const activeBookings = this.upcomingBookings ? this.upcomingBookings.length : 0;
        
        return {
            totalVenues: this.vendorVenues ? this.vendorVenues.length : 0,
            totalServices: this.vendorServices ? this.vendorServices.length : 0,
            activeBookings: activeBookings,
            totalRevenue: totalRevenue,
            serviceTypeDistribution: this.getServiceTypeDistribution(),
            serviceDistribution: this.getServiceTypeDistribution(), // Alias for HTML compatibility
            revenueByMonth: this.getRevenueByMonth(),
            venuePerformance: this.getVenuePerformance(),
            servicePricing: this.getServicePricing(),
            pricingAnalysis: this.getServicePricing(), // Alias for HTML compatibility
            avgBookingValue: activeBookings > 0 ? (totalRevenue / activeBookings).toFixed(2) : 0,
            topRevenueService: this.getTopRevenueService(),
            topVenue: this.getTopVenue(),
            insights: this.getBusinessInsights()
        };
    }

    calculateTotalRevenue() {
        if (!this.upcomingBookings) return 0;
        const grossRevenue = this.upcomingBookings.reduce((total, booking) => {
            return total + (booking.Total_Amount__c || 0);
        }, 0);
        // Apply 10% reduction to total revenue
        return grossRevenue * 0.9;
    }

    getServiceTypeDistribution() {
        if (!this.vendorServices) return [];
        
        const distribution = {};
        this.vendorServices.forEach(service => {
            const type = service.ServiceType__c || 'Other';
            distribution[type] = (distribution[type] || 0) + 1;
        });

        const maxCount = Math.max(...Object.values(distribution));
        
        return Object.entries(distribution).map(([type, count]) => ({
            type,
            count,
            barStyle: `width: ${maxCount > 0 ? (count / maxCount) * 100 : 0}%`
        }));
    }

    getRevenueByMonth() {
        if (!this.upcomingBookings) return [];
        
        const monthlyRevenue = {};
        this.upcomingBookings.forEach(booking => {
            if (booking.EventDate__c && booking.Total_Amount__c) {
                const month = new Date(booking.EventDate__c).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short' 
                });
                // Apply 10% reduction to revenue
                const adjustedRevenue = booking.Total_Amount__c * 0.9;
                monthlyRevenue[month] = (monthlyRevenue[month] || 0) + adjustedRevenue;
            }
        });

        const monthlyData = Object.entries(monthlyRevenue).map(([month, revenue]) => ({
            month,
            revenue
        }));

        // Calculate bar styles for visualization
        if (monthlyData.length > 0) {
            const maxRevenue = Math.max(...monthlyData.map(m => m.revenue));
            monthlyData.forEach(monthData => {
                const percentage = maxRevenue > 0 ? (monthData.revenue / maxRevenue) * 100 : 0;
                monthData.barStyle = `width: ${percentage}%`;
            });
        }

        return monthlyData;
    }

    getVenuePerformance() {
        if (!this.vendorVenues || !this.upcomingBookings) return [];
        
        const venueBookings = {};
        const venueRevenue = {};
        
        this.upcomingBookings.forEach(booking => {
            if (booking.Package__r && booking.Package__r.Venue__c) {
                venueBookings[booking.Package__r.Venue__c] = (venueBookings[booking.Package__r.Venue__c] || 0) + 1;
                // Apply 10% reduction to venue revenue (consistent with total revenue calculation)
                const adjustedRevenue = (booking.Total_Amount__c || 0) * 0.9;
                venueRevenue[booking.Package__r.Venue__c] = (venueRevenue[booking.Package__r.Venue__c] || 0) + adjustedRevenue;
            }
        });

        // Calculate max values for normalization
        const maxRevenue = Math.max(...Object.values(venueRevenue), 1); // Avoid division by zero
        const maxBookings = Math.max(...Object.values(venueBookings), 1);

        return this.vendorVenues.map(venue => {
            const venueId = venue.VenueId || venue.Id;
            const revenue = venueRevenue[venueId] || 0;
            const bookings = venueBookings[venueId] || 0;
            
            // Calculate performance style based on revenue (primary) or bookings (fallback)
            const performancePercentage = maxRevenue > 1 ? (revenue / maxRevenue) * 100 : (bookings / maxBookings) * 100;
            
            return {
                name: venue.VenueName || venue.Name,
                bookings: bookings,
                capacity: venue.VenueCapacity || venue.Capacity__c || 0,
                revenue: revenue,
                performanceStyle: `width: ${performancePercentage}%`
            };
        });
    }

    getServicePricing() {
        if (!this.vendorServices) return [];
        
        return this.vendorServices.map(service => ({
            name: service.ServiceType__c + (service.ServiceSubType__c ? ` - ${service.ServiceSubType__c}` : ''),
            price: service.PricePerUnit__c || 0,
            type: service.ServiceType__c
        }));
    }

    getTopRevenueService() {
        if (!this.vendorServices || this.vendorServices.length === 0) return 'No services available';
        
        // Calculate actual revenue from bookings if available
        if (this.upcomingBookings && this.upcomingBookings.length > 0) {
            const serviceRevenue = {};
            
            this.upcomingBookings.forEach(booking => {
                if (booking.Package__r && booking.Package__r.Services__c) {
                    try {
                        const services = JSON.parse(booking.Package__r.Services__c);
                        services.forEach(service => {
                            const serviceId = service.serviceId || service.id;
                            const quantity = parseInt(service.quantity) || 0;
                            const price = parseFloat(service.price) || 0;
                            const revenue = quantity * price;
                            
                            serviceRevenue[serviceId] = (serviceRevenue[serviceId] || 0) + revenue;
                        });
                    } catch (e) {
                        // Skip invalid JSON
                    }
                }
            });
            
            if (Object.keys(serviceRevenue).length > 0) {
                const topServiceId = Object.keys(serviceRevenue).reduce((a, b) => 
                    serviceRevenue[a] > serviceRevenue[b] ? a : b
                );
                const topService = this.vendorServices.find(service => 
                    (service.ServiceId || service.Id) === topServiceId
                );
                if (topService) {
                    return topService.ServiceType__c + (topService.ServiceSubType__c ? ` - ${topService.ServiceSubType__c}` : '');
                }
            }
        }
        
        // Fallback to highest priced service if no booking data
        const topService = this.vendorServices.reduce((max, service) => {
            return (service.PricePerUnit__c || 0) > (max.PricePerUnit__c || 0) ? service : max;
        });
        
        return topService.ServiceType__c + (topService.ServiceSubType__c ? ` - ${topService.ServiceSubType__c}` : '');
    }

    getTopVenue() {
        if (!this.vendorVenues || !this.upcomingBookings) return 'No data';
        
        const venueBookings = {};
        this.upcomingBookings.forEach(booking => {
            if (booking.Package__r && booking.Package__r.Venue__c) {
                venueBookings[booking.Package__r.Venue__c] = (venueBookings[booking.Package__r.Venue__c] || 0) + 1;
            }
        });

        if (Object.keys(venueBookings).length === 0) return 'No data';

        const topVenueId = Object.keys(venueBookings).reduce((a, b) => venueBookings[a] > venueBookings[b] ? a : b, '');
        const topVenue = this.vendorVenues.find(venue => (venue.VenueId || venue.Id) === topVenueId);
        return topVenue ? (topVenue.VenueName || topVenue.Name) : 'No data';
    }

    getBusinessInsights() {
        const insights = [];
        
        if (this.vendorVenues && this.vendorVenues.length > 0) {
            insights.push({
                title: 'Venue Portfolio',
                description: `You have ${this.vendorVenues.length} venue${this.vendorVenues.length !== 1 ? 's' : ''} in your portfolio.`
            });
        }
        
        if (this.vendorServices && this.vendorServices.length > 0) {
            insights.push({
                title: 'Service Offerings',
                description: `You offer ${this.vendorServices.length} different service${this.vendorServices.length !== 1 ? 's' : ''}.`
            });
        }
        
        if (this.upcomingBookings && this.upcomingBookings.length > 0) {
            insights.push({
                title: 'Business Activity',
                description: `You have ${this.upcomingBookings.length} upcoming booking${this.upcomingBookings.length !== 1 ? 's' : ''}.`
            });
        } else {
            insights.push({
                title: 'Growth Opportunity',
                description: 'Consider promoting your services to attract more bookings.'
            });
        }
        
        return insights;
    }
}