import { LightningElement, api, track, wire } from 'lwc';
import { CurrentPageReference, NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getEventTypeOptions from '@salesforce/apex/EventRequestController.getEventTypeOptions';
import createEventRequest from '@salesforce/apex/EventRequestController.createEventRequest'; 
import runPackageCuration from '@salesforce/apex/EventRequestController.runPackageCuration';

// UPDATED: Column definition now uses a 'bare' variant for the button icon
const COLUMNS = [
    { label: 'Service', fieldName: 'Service', initialWidth: 150 },
    { label: 'Subcategory', fieldName: 'Subcategory' },
    { label: 'Units', fieldName: 'Units', type: 'number', initialWidth: 100, cellAttributes: { alignment: 'center' } },
    { 
        type: 'button-icon',
        initialWidth: 50,
        typeAttributes: { 
            iconName: 'utility:delete', 
            name: 'remove', 
            variant: 'bare', // Changed from 'border-filled' to 'bare'
            alternativeText: 'Remove',
            title: 'Remove'
        },
    },
];

export default class EventRequest extends NavigationMixin(LightningElement) {
    @api recordId;
    @track selectedServiceType = '';
    @track subTypeOptions = [];
    @track tempSelections = {};
    @track finalSelections = [];
    columns = COLUMNS;
    isLoading = false;
    @track userId;


     // --- Properties for filterable dropdown ---
cityList = [
    'Agra',
    'Ahmedabad',
    'Amritsar',
    'Bangalore',
    'Bhopal',
    'Chandigarh',
    'Chennai',
    'Coimbatore',
    'Delhi',
    'Goa',
    'Gurgaon',
    'Guwahati',
    'Hyderabad',
    'Indore',
    'Jaipur',
    'Kanpur',
    'Kochi',
    'Kolkata',
    'Lucknow',
    'Ludhiana',
    'Mumbai',
    'Mysore',
    'Nagpur',
    'Noida',
    'Patna',
    'Pune',
    'Rajkot',
    'Surat',
    'Udaipur',
    'Varanasi'
];
    filteredCities = [];
    showCityDropdown = false;

    get hasFilteredCities() {
        return this.filteredCities.length > 0;
    }
     // --- Specific handlers for the location dropdown ---
    handleLocationFocus() {
        this.filteredCities = this.cityList;
        this.showCityDropdown = true;
    }
    handleLocationBlur() {
        setTimeout(() => { this.showCityDropdown = false; }, 200);
    }
    handleLocationChange(event) {
        const searchKey = event.target.value.toLowerCase();
        this.eventData.location = event.target.value;
        if (searchKey) {
            this.filteredCities = this.cityList.filter(city => city.toLowerCase().startsWith(searchKey));
        } else {
            this.filteredCities = this.cityList;
        }
        this.showCityDropdown = true;
    }
    handleLocationFocus() {
        this.filteredCities = this.cityList;
        this.showCityDropdown = true;
    }
    handleLocationBlur() {
        setTimeout(() => {
            this.showCityDropdown = false;
        }, 200);
    }
    handleCitySelect(event) {
        this.eventData.location = event.currentTarget.dataset.city;
        this.showCityDropdown = false;
    }


    @track loadingStatus = '';
    @track loadingPercentage = 0;
    _progressInterval;


    @track eventData = {
        eventType: '', location: '', guestCount: null,
        budget: null, startDate: null, endDate: null, description: ''
    };
    
    get progressBarStyle() { return `width: ${this.loadingPercentage}%`; }
    
    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        try {
            const state = currentPageReference?.state || {};
            const { location, startDate, endDate, userId } = state;
            if (userId) { this.userId = userId; }
            if (location || startDate || endDate) { this.eventData = { ...this.eventData, ...(location ? { location } : {}), ...(startDate ? { startDate } : {}), ...(endDate ? { endDate } : {}) }; }
        } catch (e) { console.warn('Failed to read page state:', e); }
    }

    @wire(getEventTypeOptions)
    wiredEventTypeOptions({ data, error }) {
        if (data) {
            this.eventTypeOptions = data;
        } else if (error) {
            this.showToast('Error', 'Failed to load Event Types.', 'error');
        }
    }

    serviceDependencyMap = { 'Catering': ['Veg Buffet', 'Non-Veg Buffet', 'Drinks & Refreshments'], 'Decoration': ['Floral Decor', 'Lighting Decor', 'Theme Decor'], 'Entertainment': ['Stage & Show(Magic show, Puppet Show, etc..)', 'Special Attraction (Anchor, Celebrities, Fireworks, etc..)', 'Music & Performance (Live Band, DJ, Dance Troop etc..)'], 'Security': ['VIP Security', 'Standard Security'], 'Transport': ['Guest Transport', 'Special Transport (Helicopter Entry, Yacht, etc...)'] };
    get serviceTypeOptions() { return Object.keys(this.serviceDependencyMap).map(key => ({ label: key, value: key })); }
    get isSaveDisabled() { const isDetailsMissing = !this.eventData.eventType || !this.eventData.location || !this.eventData.startDate || !this.eventData.endDate; const isServicesMissing = this.finalSelections.length === 0; return isDetailsMissing || isServicesMissing || this.isLoading; }
    handleDetailChange(event) { const fieldName = event.target.name; let fieldValue; if (event.target.tagName === 'LIGHTNING-COMBOBOX') { fieldValue = event.detail.value; } else { fieldValue = event.target.value; } if (fieldName === 'guestCount' || fieldName === 'budget') { this.eventData[fieldName] = fieldValue ? Number(fieldValue) : null; } else { this.eventData[fieldName] = fieldValue; } }
    handleServiceTypeChange(event) { this.selectedServiceType = event.detail.value; this.tempSelections = {}; const subtypes = this.serviceDependencyMap[this.selectedServiceType]; if (subtypes) { this.subTypeOptions = subtypes.map(st => ({ label: st, value: st, disabled: true })); } else { this.subTypeOptions = []; } }
    handleSubtypeSelection(event) { const subTypeName = event.target.dataset.name; const isChecked = event.target.checked; const updatedOptions = [...this.subTypeOptions]; const option = updatedOptions.find(opt => opt.value === subTypeName); if (option) { option.disabled = !isChecked; } this.subTypeOptions = updatedOptions; if (isChecked) { this.tempSelections[subTypeName] = { selected: true, units: this.tempSelections[subTypeName]?.units || '' }; } else { delete this.tempSelections[subTypeName]; } }
    handleUnitChange(event) { const subTypeName = event.target.dataset.name; const units = event.target.value; if (this.tempSelections[subTypeName]) { this.tempSelections[subTypeName].units = parseInt(units, 10) || null; } }
    
    handleAddServices() {
        const itemsToAdd = Object.keys(this.tempSelections)
            .filter(key => this.tempSelections[key].units && this.tempSelections[key].units > 0)
            .map(key => ({
                id: `${this.selectedServiceType}-${key}`,
                Service: this.selectedServiceType,
                Subcategory: key,
                Units: this.tempSelections[key].units
            }));

        if (itemsToAdd.length === 0) {
            this.showToast('Warning', 'Please select a subtype and enter units.', 'warning');
            return;
        }
        const itemIdsToAdd = itemsToAdd.map(item => item.id);
        let otherSelections = this.finalSelections.filter(sel => !itemIdsToAdd.includes(sel.id));
        this.finalSelections = [...otherSelections, ...itemsToAdd];
        this.selectedServiceType = '';
        this.subTypeOptions = [];
        this.tempSelections = {};
        this.showToast('Success', 'Services list updated.', 'success');
    }

    handleRemoveService(event) {
        const rowId = event.detail.row.id;
        this.finalSelections = this.finalSelections.filter(item => item.id !== rowId);
    }
    
    async handleSave() {
        if (!this.userId) { this.showToast('Error', 'User ID is missing.', 'error'); return; }
        const allValid = [...this.template.querySelectorAll('lightning-input, lightning-combobox, lightning-textarea')].reduce((validSoFar, inputCmp) => { inputCmp.reportValidity(); return validSoFar && inputCmp.checkValidity(); }, true);
        if (!allValid || this.finalSelections.length === 0) { this.showToast('Error', 'Please fill all required fields and add at least one service.', 'error'); return; }

        this.isLoading = true;
        this.startProgressSimulation(0, 30, 2500, 'Submitting your event details...');
        const servicesToSave = this.finalSelections.map(({ id, ...rest }) => rest);
        const finalPayload = { ...this.eventData, servicesJson: JSON.stringify({ services: servicesToSave }, null, 2) };
        const eventDataJSON = JSON.stringify(finalPayload);

        try {
            const newEventRequestId = await createEventRequest({ userId: this.userId, eventDataJSON: eventDataJSON });
            this.updateProgress(40, 'Request received! Curating packages with AI...');
            this.startProgressSimulation(40, 90, 8000);
            const flowResult = await runPackageCuration({ eventRequestId: newEventRequestId });
            this.updateProgress(100, 'Packages found! Preparing to redirect...');

            if (flowResult && flowResult.packageId) {
                const navParams = { packageid: flowResult.packageId, userid: this.userId, startdate: this.eventData.startDate, enddate: this.eventData.endDate };
                const url = `/package?${new URLSearchParams(navParams).toString()}`;
                window.setTimeout(() => { this[NavigationMixin.Navigate]({ type: 'standard__webPage', attributes: { url: url }}); }, 800);
            } else {
                this.stopLoadingWithError(`Package curation returned no packages. ${flowResult?.status || ''}`);
            }
        } catch (error) {
            this.stopLoadingWithError(error.body.message);
        }
    }

    startProgressSimulation(start, end, duration, statusText) {
        if (statusText) { this.loadingStatus = statusText; }
        if (this._progressInterval) { clearInterval(this._progressInterval); }
        this.loadingPercentage = start;
        const increment = (end - start) / (duration / 50);
        this._progressInterval = setInterval(() => {
            if (this.loadingPercentage < end) { this.loadingPercentage = Math.min(Math.ceil(this.loadingPercentage + increment), end); } 
            else { clearInterval(this._progressInterval); }
        }, 50);
    }
    updateProgress(percentage, statusText) { if (this._progressInterval) { clearInterval(this._progressInterval); } this.loadingPercentage = percentage; if (statusText) { this.loadingStatus = statusText; } }
    stopLoadingWithError(errorMessage) { if (this._progressInterval) { clearInterval(this._progressInterval); } this.isLoading = false; this.loadingPercentage = 0; this.showToast('Error', errorMessage, 'error'); }
    showToast(title, message, variant) { this.dispatchEvent(new ShowToastEvent({ title, message, variant })); }
}