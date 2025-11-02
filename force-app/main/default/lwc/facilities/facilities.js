import { LightningElement, api, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getServiceDefinitions from '@salesforce/apex/FacilitiesController.getServiceDefinitions';
import savePackageDetails from '@salesforce/apex/FacilitiesController.savePackageDetails';

export default class Facilities extends LightningElement {
    // Hardcoded IDs as requested
    eventCompanyId = 'a01gK00000M1F8QQAV';
    venueId = 'a02gK000005zxmfQAA';

    @track servicesByType = [];
    selections = new Map();
    isLoading = true;
    hasServices = false;

    // The wire service automatically uses the hardcoded eventCompanyId
    @wire(getServiceDefinitions, { eventCompanyId: '$eventCompanyId' })
    wiredServices({ error, data }) {
        if (data) {
            if(data.length > 0){
                this.groupServices(data);
                this.hasServices = true;
            } else {
                this.hasServices = false;
            }
            this.isLoading = false;
        } else if (error) {
            this.showToast('Error', 'Failed to load services.', 'error');
            this.isLoading = false;
        }
    }

    groupServices(data) {
        // Initialize services data for LWC reactivity
        const grouped = data.reduce((acc, service) => {
            // Create a writable copy and initialize state properties
            const serviceCopy = { 
                ...service, 
                isQuantityDisabled: true, 
                units: 0 // Initialize units for tracking quantity
            };

            let group = acc.find(g => g.type === serviceCopy.Service_Type__c);
            if (group) {
                group.subtypes.push(serviceCopy);
            } else {
                acc.push({ type: serviceCopy.Service_Type__c, subtypes: [serviceCopy] });
            }
            return acc;
        }, []);
        this.servicesByType = grouped;
    }

    handleSelection(event) {
        const serviceId = event.target.dataset.id;
        const isChecked = event.target.checked;
        
        // Use map/reduce to update the state of the specific service in the @track array
        this.servicesByType = this.servicesByType.map(group => {
            group.subtypes = group.subtypes.map(subtype => {
                if (subtype.Id === serviceId) {
                    const newUnits = isChecked ? (subtype.units > 0 ? subtype.units : 1) : 0;
                    
                    return { 
                        ...subtype, 
                        isQuantityDisabled: !isChecked,
                        units: newUnits 
                    };
                }
                return subtype;
            });
            return group;
        });

        // Update the selections map for easy access in handleSave
        if (isChecked) {
             this.selections.set(serviceId, this.servicesByType.flatMap(g => g.subtypes).find(s => s.Id === serviceId).units);
        } else {
            this.selections.delete(serviceId);
        }
    }

    handleQuantityChange(event) {
        const serviceId = event.target.dataset.id;
        // Ensure quantity is treated as an integer, default to 0 if invalid/empty
        const quantity = parseInt(event.target.value, 10) || 0; 
        
        // Update the @track servicesByType array
        this.servicesByType = this.servicesByType.map(group => {
            group.subtypes = group.subtypes.map(subtype => {
                if (subtype.Id === serviceId) {
                    return { ...subtype, units: quantity };
                }
                return subtype;
            });
            return group;
        });
        
        // Update the selections map
        if (this.selections.has(serviceId)) {
             this.selections.set(serviceId, quantity);
        }
    }

    // NOTE: The toggleQuantityInput method is now obsolete as the logic is in handleSelection
    // But kept here for completeness, though it's better to update the array directly.
    toggleQuantityInput(serviceId, isDisabled) {
        this.servicesByType = this.servicesByType.map(group => {
            group.subtypes = group.subtypes.map(subtype => {
                if (subtype.Id === serviceId) {
                    return { ...subtype, isQuantityDisabled: isDisabled };
                }
                return subtype;
            });
            return group;
        });
    }

    async handleSave() {
        this.isLoading = true;
        
        // Gather all selected services with a quantity > 0
        const servicesToSave = this.servicesByType.flatMap(g => g.subtypes)
            .filter(s => !s.isQuantityDisabled && s.units > 0)
            .map(def => {
                return {
                    serviceId: def.Id,
                    serviceName: def.Name,
                    serviceType: def.Service_Type__c,
                    serviceSubType: def.Service_SubType__c,
                    pricePerUnit: def.Price__c,
                    units: def.units // Use the units from the data model
                };
            });

        if (servicesToSave.length === 0) {
            this.showToast('Info', 'Please select at least one service with a quantity greater than 0.', 'info');
            this.isLoading = false;
            return;
        }

        try {
            const result = await savePackageDetails({ 
                eventCompanyId: this.eventCompanyId,
                venueId: this.venueId,
                selectedServices: servicesToSave 
            });
            this.showToast('Success', result, 'success');
            // Re-fetch or reset the component to clear state after save
            this.resetComponent(); 

        } catch (error) {
            console.error('Save Error:', error);
            const errorMessage = error.body ? error.body.message : error.message || 'An unknown error occurred.';
            this.showToast('Error Creating Package', errorMessage, 'error');
        } finally {
            this.isLoading = false;
        }
    }
    
    get isSaveDisabled() {
        // Disable save if loading or if no valid selections exist
        return this.isLoading || this.servicesByType.flatMap(g => g.subtypes).filter(s => s.units > 0).length === 0;
    }
    
    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    resetComponent() {
        this.selections.clear();
        // Reset the tracked data structure to its initial, unselected state
        this.groupServices(this.servicesByType.flatMap(g => g.subtypes).map(s => ({ 
            Id: s.Id, 
            Name: s.Name, 
            Service_Type__c: s.Service_Type__c, 
            Service_SubType__c: s.Service_SubType__c, 
            Price__c: s.Price__c 
        })));
    }
}