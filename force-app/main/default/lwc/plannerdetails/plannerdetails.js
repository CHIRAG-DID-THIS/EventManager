import { LightningElement, wire } from 'lwc';
import { CurrentPageReference, NavigationMixin } from 'lightning/navigation';
import getPlannerDetails from '@salesforce/apex/PlannerController.getPlannerDetails';

export default class PlannerDetails extends NavigationMixin(LightningElement) {
    plannerId;
    venueId;
    userId;
    startDate;
    endDate;
    
    planner;
    selectedVenue;
    otherVenues = [];
    servicesOffered = [];
    error;

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.plannerId = currentPageReference.state.companyId;
            this.venueId = currentPageReference.state.venueId;
            this.userId = currentPageReference.state.userId; 
            this.startDate = currentPageReference.state.startDate;
            this.endDate = currentPageReference.state.endDate;
        }
    }

    @wire(getPlannerDetails, { plannerId: '$plannerId' , venueId: '$venueId'})
    wiredPlanner({ data, error }) {
        if (data) {
            this.planner = data.planner;
            
            if (data.selectedVenue) {
                this.selectedVenue = {
                    ...data.selectedVenue,
                    heroImageUrl: this.extractImageUrl(data.selectedVenue.Descriptions__c)
                };
            }
            
            this.otherVenues = data.otherVenues.map(v => ({
                ...v,
                heroImageUrl: this.extractImageUrl(v.Descriptions__c)
            }));
            
            const servicesMap = new Map();
            data.servicesOffered.forEach((service, index) => {
                const type = service.Service_Type__c;
                if (!servicesMap.has(type)) {
                    servicesMap.set(type, { type: type, subtypes: [] });
                }
                servicesMap.get(type).subtypes.push({ ...service, sectionNumber: index + 1 });
            });
            this.servicesOffered = Array.from(servicesMap.values());

            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.planner = undefined;
        }
    }
    
    extractImageUrl(description) {
        if (description) {
            const regex = /<img[^>]+src="([^">]+)"/;
            const match = description.match(regex);
            if (match && match[1]) {
                return match[1].replace(/&amp;/g, '&');
            }
        }
        return 'https://images.unsplash.com/photo-1558221634-b2e836195325?q=80&w=800';
    }
    
    // UPDATED: Navigation now builds the URL string directly
    handleProceed() {
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: `/facilities?companyId=${this.plannerId}&venueId=${this.venueId}&userId=${this.userId}&startDate=${this.startDate}&endDate=${this.endDate}`
            }
        });
    }

    // UPDATED: Navigation now builds the URL string directly
    handleVenueClick(event) {
        const newVenueId = event.currentTarget.dataset.id;
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: `/venues?id=${newVenueId}&userId=${this.userId}&startDate=${this.startDate}&endDate=${this.endDate}`
            }
        });
    }
}