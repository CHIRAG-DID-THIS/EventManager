import { LightningElement, wire } from 'lwc';
import getVenueDetails from '@salesforce/apex/VenueController.getVenueDetails';
import getPlannerVenueLinks from '@salesforce/apex/VenueController.getPlannerVenueLinks';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';

export default class VenueDetails extends NavigationMixin(LightningElement) {
    venueId;
    userId;
    startDate;
    endDate;

    venue; // This will now correctly hold the Venue__c record
    heroImageUrl;
    galleryImageUrls;

    plannerId;
    plannerVenueList;   
    error;

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.venueId = currentPageReference.state.id;
            this.plannerId = currentPageReference.state.companyId;
            this.userId = currentPageReference.state.userId; 
            this.startDate = currentPageReference.state.startDate;
            this.endDate = currentPageReference.state.endDate;

        }
    }

    @wire(getVenueDetails, { venueId: '$venueId' })
    wiredVenue({ error, data }) {
        if (data) {
            this.venue = data.venueRecord; 
            this.heroImageUrl = data.heroImageUrl;
            if (data.galleryImageUrls && data.galleryImageUrls.length > 0) {
                this.galleryImageUrls = [...data.galleryImageUrls, ...data.galleryImageUrls];
            }
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.venue = undefined;
            console.error('Error fetching venue:', error);
        }
    }

@wire(getPlannerVenueLinks, { venueId: '$venueId' })
wiredPlannerVenue({ error, data }) {
    if (data && data.length > 0) {
        // Add plannerUrl dynamically
        this.plannerVenueList = data.map(planner => ({
            ...planner,
            plannerUrl: `/eventplanners?companyId=${planner.EventComapny__c}&venueId=${this.venueId}&userId=${this.userId}&startDate=${this.startDate}&endDate=${this.endDate}`
        }));
    } else if (error) {
        console.error('Error fetching planner-venue links:', error);
    }
}

    get availabilityVariant() {
        if (this.venue) {
            return this.venue.Unavailable__c ? 'error' : 'success';
        }
        return 'default';
    }
    
    // ADD THIS NEW GETTER
    get availabilityText() {
        if (this.venue) {
            return this.venue.Unavailable__c ? 'No' : 'Yes';
        }
        return ''; // Return an empty string until the data loads
    }

    getPlannerUrl(plannerId) {
    return `/eventplanners?companyId=${plannerId}&venueId=${this.venueId}&userId=${this.userId}&startDate=${this.startDate}&endDate=${this.endDate}`;
}

    navigateToCompany(event) {
        const companyId = event.currentTarget.dataset.id;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                url: `/eventplanners?companyId=${companyId}&venueId=${this.venueId}&userId=${this.userId}&startDate=${this.startDate}&endDate=${this.endDate}`,
            }
        });
    }
}