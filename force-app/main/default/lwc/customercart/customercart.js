import { LightningElement, wire } from 'lwc';
import { CurrentPageReference, NavigationMixin } from 'lightning/navigation';
import getPackageDetails from '@salesforce/apex/customercart.getPackageDetails';
// UPDATED: Import the new combined Apex method
import createBookingAndPayment from '@salesforce/apex/customerbooking.createBookingAndPayment';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class CustomerCart extends NavigationMixin(LightningElement) {
    packageId;
    userId;
    startDate;
    endDate;
    
    packageData;
    parsedServices = [];
    isLoading = true;
    error;
    
    showSuccessModal = false;

    // --- NEW PAYMENT MODAL PROPERTIES ---
    showPaymentModal = false;
    selectedPaymentMethod = '';
    paymentOptions = [
        { label: 'Card', value: 'Card' },
        { label: 'UPI', value: 'UPI' },
        { label: 'PayPal', value: 'PayPal' }
    ];

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.packageId = currentPageReference.state.packageId;
            this.userId = currentPageReference.state.userId;
            this.startDate = currentPageReference.state.startDate;
            this.endDate = currentPageReference.state.endDate;
        }
    }

    @wire(getPackageDetails, { packageId: '$packageId' })
    wiredPackage({ error, data }) {
        if (data) {
            this.packageData = data;
            if (data.packageRecord && data.packageRecord.Services__c) {
                try {
                    // Use the more detailed services JSON structure
                    const servicesWrapper = JSON.parse(data.packageRecord.Services__c);
                    this.parsedServices = servicesWrapper || [];
                } catch (e) {
                    console.error('Error parsing services JSON:', e);
                    this.parsedServices = [];
                }
            }
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.packageData = undefined;
            console.error("Error fetching package details:", error);
        }
        this.isLoading = false;
    }

    // --- GETTERS ---
    get servicesCost() { return this.packageData ? this.packageData.packageRecord.TotalCost__c : 0; }
    get venuePrice() { return this.packageData ? this.packageData.venuePrice : 0; }
    get serviceCharge() { return this.packageData ? this.packageData.serviceCharge : 0; }
    get grandTotal() { return this.packageData ? this.packageData.grandTotal : 0; }

    // --- NEW PAYMENT GETTERS ---
    get isCardPayment() { return this.selectedPaymentMethod === 'Card'; }
    get isUpiPayment() { return this.selectedPaymentMethod === 'UPI'; }
    get isPayPalPayment() { return this.selectedPaymentMethod === 'PayPal'; }
    get isPayButtonDisabled() { return !this.selectedPaymentMethod || this.isLoading; }


    // --- MODAL HANDLERS ---
    openPaymentModal() {
        this.showPaymentModal = true;
    }

    closePaymentModal() {
        this.showPaymentModal = false;
        this.selectedPaymentMethod = '';
    }

    handlePaymentMethodChange(event) {
        this.selectedPaymentMethod = event.detail.value;
    }

    // UPDATED: This is the old handleBookAndPay, now renamed and used to open the modal
    handleBookAndPay() {
        this.openPaymentModal();
    }

    // NEW: This method is called when the user clicks "Pay Now" in the modal
    async handleFinalPayment() {
        this.isLoading = true;

        try {
            const bookingParams = {
                packageId: this.packageId,
                userdataId: this.userId,
                eventDate: this.startDate,
                endDate: this.endDate,
                amount: this.grandTotal,
                paymentMethod: this.selectedPaymentMethod
            };

            const newBookingId = await createBookingAndPayment(bookingParams);
            
            console.log('Booking and Payment created. Booking ID: ' + newBookingId);

            // Close the payment modal and show the success overlay
            this.closePaymentModal();
            this.showSuccessModal = true;
            
            setTimeout(() => {
                this[NavigationMixin.Navigate]({
                    type: 'standard__webPage',
                    attributes: {
                        url: `/chome?userId=${this.userId}` // Assuming /s/chome is your customer home page
                    }
                });
            }, 4000);

        } catch (error) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Booking Failed',
                message: error.body.message,
                variant: 'error'
            }));
            this.isLoading = false;
        }
    }
}