import { LightningElement, api, track } from 'lwc';
import getVenueDetails from '@salesforce/apex/VenueController.getVenueDetails';

export default class VenueDetailsForVendor extends LightningElement {
    @api venueId;
    
    @track venue;
    @track heroImageUrl;
    @track galleryImageUrls;
    @track error;
    @track isLoading = true;

    connectedCallback() {
        if (this.venueId) {
            this.loadVenueDetails();
        }
    }

    loadVenueDetails() {
        this.isLoading = true;
        getVenueDetails({ venueId: this.venueId })
            .then(data => {
                if (data) {
                    this.venue = data.venueRecord;
                    this.heroImageUrl = data.heroImageUrl;
                    if (data.galleryImageUrls && data.galleryImageUrls.length > 0) {
                        this.galleryImageUrls = [...data.galleryImageUrls, ...data.galleryImageUrls];
                    }
                    this.error = undefined;
                }
                this.isLoading = false;
            })
            .catch(error => {
                this.error = error;
                this.venue = undefined;
                this.heroImageUrl = undefined;
                this.galleryImageUrls = undefined;
                this.isLoading = false;
                console.error('Error fetching venue:', error);
            });
    }

    get availabilityVariant() {
        if (this.venue) {
            return this.venue.Unavailable__c ? 'error' : 'success';
        }
        return 'default';
    }
    
    get availabilityText() {
        if (this.venue) {
            return this.venue.Unavailable__c ? 'No' : 'Yes';
        }
        return '';
    }

    get hasVenue() {
        return this.venue && !this.isLoading;
    }
}