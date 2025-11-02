import { LightningElement, wire } from 'lwc';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';

export default class CustomerSearch extends NavigationMixin(LightningElement) {
    // Component properties
    location = '';
    userId;
    startDate;
    endDate;
    showErrorModal = false;
    modalMessage = '';
    
    // City dropdown properties
    showCityDropdown = false;
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

    get hasFilteredCities() {
        return this.filteredCities.length > 0;
    }

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.userId = currentPageReference.state.userId;
        }
    }

    // --- HANDLERS ---

    // This is the single, correct version that filters the city list
    handleLocationChange(event) {
        const searchKey = event.target.value.toLowerCase();
        this.location = event.target.value;

        if (searchKey) {
            this.filteredCities = this.cityList.filter(
                city => city.toLowerCase().startsWith(searchKey)
            );
        } else {
            this.filteredCities = this.cityList;
        }
    }

    handleStartDateChange(event) {
        this.startDate = event.target.value;
        if (this.endDate && this.endDate < this.startDate) {
            this.endDate = '';
        }
    }

    handleEndDateChange(event) {
        this.endDate = event.target.value;
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
        this.location = event.currentTarget.dataset.city;
        this.showCityDropdown = false;
    }


    handleSearch() {
        if (!this.location || !this.startDate || !this.endDate) {
            this.showModal('Please fill in all required fields.');
            return;
        }

        const searchEvent = new CustomEvent('search', {
            detail: {
                location: this.location,
                startDate: this.startDate,
                endDate: this.endDate
            }
        });
        this.dispatchEvent(searchEvent);
    }
    
    showModal(message) {
        this.modalMessage = message;
        this.showErrorModal = true;
        setTimeout(() => {
            this.showErrorModal = false;
        }, 2000);
    }

    handleAIPackage() {
        const params = new URLSearchParams();

        if (this.userId) {
            params.set('userId', this.userId);
        }

        if (this.location && this.location.trim().length) {
            params.set('location', this.location.trim());
        }
        if (this.startDate) {
            params.set('startDate', this.startDate);
        }
        if (this.endDate) {
            params.set('endDate', this.endDate);
        }

        const query = params.toString();
        const url = `/eventrequest${query ? `?${query}` : ''}`; 

        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: { url }
        });
    }
}