import { LightningElement, wire } from 'lwc';
import { CurrentPageReference, NavigationMixin } from 'lightning/navigation';
import findVenues from '@salesforce/apex/customervenuesearch.findVenues';

export default class CustomerHome extends NavigationMixin(LightningElement) {
    
    userId;
    venues;
    isLoading = false;
    noResultsFound = false;
    isSearching = false;
    searchStartDate;
    searchEndDate;

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.userId = currentPageReference.state.userId;
        }
    }

    handleSearchEvent(event) {
        const { location, startDate, endDate } = event.detail;
        this.searchStartDate = startDate;
        this.searchEndDate = endDate;
        this.isSearching = true; 
        this.isLoading = true;
        this.venues = undefined;
        this.noResultsFound = false;

        findVenues({ location: location, startDate: startDate, endDate: endDate })
            .then(result => {
                if (result && result.length > 0) {
                    this.venues = result;
                } else {
                    this.noResultsFound = true;
                }
            })
            .catch(error => {
                console.error('Error fetching venues:', error);
                this.noResultsFound = true;
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    handleVenueSelected(event) {
        const venueId = event.detail.venueId;
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: `/venues?id=${venueId}&userId=${this.userId}&startDate=${this.searchStartDate}&endDate=${this.searchEndDate}`
            }
        });
    }
}