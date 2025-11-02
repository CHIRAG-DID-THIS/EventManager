import { LightningElement, wire } from 'lwc';
import { CurrentPageReference, NavigationMixin } from 'lightning/navigation';
import getPackagesDetails from '@salesforce/apex/PackageDisplayController.getPackagesDetails';

export default class PackageDisplay extends NavigationMixin(LightningElement) {
    packageIds = [];
    userId;
    startDate;
    endDate;

    packageList = [];
    isLoading = true;
    error;

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            const state = currentPageReference.state;
            if (state.packageid) {
                this.packageIds = state.packageid.split('-');
            }
            this.userId = state.userid;
            this.startDate = state.startdate;
            this.endDate = state.enddate;
        }
    }

    @wire(getPackagesDetails, { packageIds: '$packageIds' })
    wiredPackages({ error, data }) {
        if (data) {
            this.packageList = data.map((pkgWrapper, index) => {
                let parsedServices = [];
                if (pkgWrapper.packageRecord && pkgWrapper.packageRecord.Services__c) {
                    try {
                        parsedServices = JSON.parse(pkgWrapper.packageRecord.Services__c);
                    } catch (e) { console.error('Error parsing services JSON:', e); }
                }
                
                return { 
                    ...pkgWrapper, 
                    parsedServices: parsedServices,
                    displayPackageName: `Package ${index + 1}`,
                    venueImageUrl: this.extractImageUrl(pkgWrapper.venue)
                };
            });
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.packageList = [];
            console.error("Error fetching packages:", error);
        }
        this.isLoading = false;
    }

    // UPDATED: More robust helper function
    extractImageUrl(venue) {
        if (venue && venue.Descriptions__c) {
            const description = venue.Descriptions__c;
            const regex = /<img[^>]+src="([^">]+)"/;
            const match = description.match(regex);
            if (match && match[1]) {
                return match[1].replace(/&amp;/g, '&');
            }
        }
        return 'https://images.unsplash.com/photo-1558221634-b2e836195325?q=80&w=800';
    }

    // UPDATED: Handle the click on the "Select Package" button
    handleSelectPackage(event) {
        const selectedPackageId = event.currentTarget.dataset.id;

        // Construct the URL exactly as requested
        const url = `/cart?packageId=${selectedPackageId}&userId=${this.userId}&startDate=${this.startDate}&endDate=${this.endDate}`;

        // Navigate using standard__webPage type
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: url
            }
        });
    }
}