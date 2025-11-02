public with sharing class customerbooking {

    // This is the new, primary method to be called from the LWC
    @AuraEnabled
    public static Id createBookingAndPayment(Id packageId, Id userdataId, Date eventDate, Date endDate, Decimal amount, String paymentMethod) {
        if (packageId == null || userdataId == null || eventDate == null || endDate == null) {
            throw new AuraHandledException('Package ID, Userdata ID, Start Date, and End Date are required.');
        }

        // Use a Savepoint to ensure this is an all-or-nothing transaction
        Savepoint sp = Database.setSavepoint();
        try {
            // 1. Create the Booking record first
            Booking__c newBooking = createNewBooking(packageId, userdataId, eventDate, endDate, amount);
            insert newBooking;

            // 2. Create the related Payment record
            EventPayement__c newPayment = new EventPayement__c(
                Booking__c = newBooking.Id,
                Amount__c = amount,
                Payment_Method__c = paymentMethod,
                Status__c = 'Successful',
                Transaction_Id__c = 'TXN-' + System.now().getTime(), // Mock transaction ID
                Payment_Date__c = System.now()
            );
            insert newPayment;

            // 3. Block the venue's availability
            Package__c pkg = [SELECT Id, Venue__c FROM Package__c WHERE Id = :packageId LIMIT 1];
            blockAvailability(pkg.Venue__c, eventDate, endDate);

            return newBooking.Id;

        } catch (Exception e) {
            Database.rollback(sp); // If anything fails, undo the transaction
            throw new AuraHandledException('Error during booking process: ' + e.getMessage());
        }
    }

    // Private helper method to construct the Booking object
    private static Booking__c createNewBooking(Id packageId, Id userdataId, Date eventDate, Date endDate, Decimal totalAmount) {
        Package__c pkg = [SELECT Id, Services__c FROM Package__c WHERE Id = :packageId LIMIT 1];
        
        return new Booking__c(
            Package__c = packageId,
            Userdata__c = userdataId,
            Total_Amount__c = totalAmount,
            EventDate__c = eventDate,
            Event_End_Date__c = endDate,
            Booking_Details__c = pkg.Services__c,
            Status__c = 'Confirmed',
            Booking_Confirmed__c = true
        );
    }
    
    // This method is now called internally
    private static void blockAvailability(Id venueId, Date startDate, Date endDate) {
        if (venueId == null || startDate == null || endDate == null) {
            System.debug('Could not block availability: Missing required information.');
            return;
        }
        
        Availabilty__c newAvailability = new Availabilty__c(
            Venue__c = venueId,
            StartDate__c = startDate,
            EndDate__c = endDate
        );

        try {
            insert newAvailability;
        } catch (Exception e) {
            // Log the error but don't stop the whole transaction
            System.debug('Failed to create availability record: ' + e.getMessage());
        }
    }

    // The old createBooking method is no longer needed by the LWC
    // It is kept here in case other processes use it, or can be removed.
    @AuraEnabled
    public static Id createBooking(Id packageId, Id userdataId, Date eventDate, Date endDate) {
        return createNewBooking(packageId, userdataId, eventDate, endDate, 0).Id; // Note: Amount would be missing
    }
}