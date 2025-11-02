import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import findVenues from '@salesforce/apex/VenueSearchController.findVenues';

export default class EventSearch extends LightningElement {
    // Search parameters
    @track location = '';
    @track eventDate;
    @track capacity = 10; // Default capacity

    // UI state and results
    @track isLoading = false;
    @track searchResults = [];

    handleInputChange(event) {
        const field = event.target.name;
        if (field === 'location') {
            this.location = event.target.value;
        } else if (field === 'eventDate') {
            this.eventDate = event.target.value;
        } else if (field === 'capacity') {
            this.capacity = event.target.value;
        }
    }

    handleSearch() {
        // Basic validation
        if (!this.location) {
            this.showToast('Validation Error', 'Please enter a location or venue name to search.', 'error');
            return;
        }

        this.isLoading = true;
        findVenues({
            location: this.location,
            eventDate: this.eventDate,
            capacity: this.capacity
        })
        .then(result => {
            this.searchResults = result;
            if(result.length === 0){
                this.showToast('No Results', 'No venues were found matching your criteria. Please try different options.', 'info');
            }
        })
        .catch(error => {
            this.showToast('Search Error', 'An error occurred during the search: ' + error.body.message, 'error');
            this.searchResults = []; // Clear previous results on error
        })
        .finally(() => {
            this.isLoading = false;
        });
    }
    
    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}