import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class VenueResults extends NavigationMixin(LightningElement) {
    // Public property to receive the search results from the parent component
    @api searchResults = [];

    // Getter to easily check if there are any results
    get hasResults() {
        return this.searchResults && this.searchResults.length > 0;
    }

    handleVenueSelect(event) {
        // Prevent the default link behavior
        event.preventDefault();
        const venueId = event.currentTarget.dataset.id;
        
        // Use the NavigationMixin to navigate to a new page in the Experience Cloud site
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                // IMPORTANT: 'venue-detail' is the API Name of the page you must create
                // in the Experience Builder to host the venueDetail LWC.
                // The recordId is passed as a URL parameter.
                url: '/venue-detail?recordId=' + venueId
            }
        });
    }
}