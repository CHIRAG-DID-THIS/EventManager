import { LightningElement, wire } from 'lwc';
import { CurrentPageReference, NavigationMixin } from 'lightning/navigation';
import getServiceDefinitions from '@salesforce/apex/FacilitiesController.getServiceDefinitions';
import savePackageDetails from '@salesforce/apex/FacilitiesController.savePackageDetails';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class ServiceSelection extends NavigationMixin(LightningElement) {

    eventCompanyId;
    venueId;
    startDate;
    endDate;
    userId;

    groupedServices = [];
    allServicesMap = new Map();
    error;
    loading = true;

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.eventCompanyId = currentPageReference.state.companyId;
            this.venueId = currentPageReference.state.venueId;
            this.startDate = currentPageReference.state.startDate;
            this.endDate = currentPageReference.state.endDate;
            this.userId = currentPageReference.state.userId;
        }
    }

    @wire(getServiceDefinitions, { eventCompanyId: '$eventCompanyId' })
    wiredServices({ error, data }) {
        if (data) {
            this.processServices(data);
            this.error = undefined;
        } else if (error) {
            this.error = 'Could not load services.';
            console.error('Error fetching services:', error);
        }
        this.loading = false;
    }

    processServices(services) {
        const serviceMap = new Map();
        services.forEach(service => {
            // Determine the unit label based on the service type
            let unitLabel = '';
            const type = service.Service_Type__c;
            if (type === 'Catering') {
                unitLabel = '/ plate';
            } else if (type === 'Decoration' || type === 'Entertainment' || type === 'Security' || type === 'Transport') {
                unitLabel = '/ day';
            }

            // Add the new property along with the quantity
            const serviceWithQty = { ...service, quantity: 0, unitLabel: unitLabel };
            this.allServicesMap.set(service.Id, serviceWithQty);

            if (!serviceMap.has(type)) {
                serviceMap.set(type, {
                    serviceType: type,
                    expanded: true,
                    expandedIcon: 'utility:chevrondown',
                    subtypes: []
                });
            }
            serviceMap.get(type).subtypes.push(serviceWithQty);
        });
        this.groupedServices = Array.from(serviceMap.values());
    }

    handleHeaderClick(event) {
        const serviceType = event.currentTarget.dataset.id;
        this.groupedServices = this.groupedServices.map(group => {
            if (group.serviceType === serviceType) {
                const isExpanded = !group.expanded;
                return { ...group, expanded: isExpanded, expandedIcon: isExpanded ? 'utility:chevrondown' : 'utility:chevronright' };
            }
            return group;
        });
    }

    handleQtyChange(event) {
        const serviceId = event.target.dataset.id;
        const quantity = parseInt(event.target.value, 10) || 0;
        if (this.allServicesMap.has(serviceId)) {
            this.allServicesMap.get(serviceId).quantity = quantity;
            this.allServicesMap = new Map(this.allServicesMap);
        }
    }

    get selectedItems() {
        return Array.from(this.allServicesMap.values())
            .filter(service => service.quantity > 0)
            .map(service => ({
                ...service,
                total: service.Price__c * service.quantity
            }));
    }

    async handleSaveSelections() {
        this.loading = true;
        const servicesToSave = this.selectedItems.map(item => ({
            serviceId: item.Id, serviceName: item.Name, serviceType: item.Service_Type__c,
            serviceSubType: item.Service_SubType__c, pricePerUnit: item.Price__c, units: item.quantity
        }));

        if (servicesToSave.length === 0) {
            this.dispatchEvent(new ShowToastEvent({ title: 'Warning', message: 'No items selected to save.', variant: 'warning' }));
            this.loading = false;
            return;
        }

        try {
            await savePackageDetails({
                eventCompanyId: this.eventCompanyId,
                venueId: this.venueId,
                selectedServices: servicesToSave,
                startDate: this.startDate,
                endDate: this.endDate
            });

            this.dispatchEvent(new ShowToastEvent({
                title: 'Success',
                message: 'Your selections have been saved as a new package!',
                variant: 'success'
            }));

        } catch (error) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error Saving Package',
                message: error.body.message,
                variant: 'error'
            }));
        } finally {
            this.loading = false;
        }
    }

     async handleProceedToBooking() {
        this.loading = true;
        const servicesToSave = this.selectedItems.map(item => ({
            serviceId: item.Id, serviceName: item.Name, serviceType: item.Service_Type__c,
            serviceSubType: item.Service_SubType__c, pricePerUnit: item.Price__c, units: item.quantity
        }));

        if (servicesToSave.length === 0) {
            this.dispatchEvent(new ShowToastEvent({ title: 'Warning', message: 'Please select at least one service to proceed.', variant: 'warning' }));
            this.loading = false;
            return;
        }

        try {
            const newPackageId = await savePackageDetails({
                eventCompanyId: this.eventCompanyId,
                venueId: this.venueId,
                selectedServices: servicesToSave
            });

            // UPDATED: Navigation logic now builds the URL string directly
            this[NavigationMixin.Navigate]({
                type: 'standard__webPage',
                attributes: {
                    // Use a template literal to build the full URL with the parameter
                    url: `/cart?packageId=${newPackageId}&userId=${this.userId}&startDate=${this.startDate}&endDate=${this.endDate}`
                }
                // The 'state' object is no longer needed
            });

        } catch (error) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error Saving Package',
                message: error.body.message,
                variant: 'error'
            }));
            this.loading = false;
        }
    }
}