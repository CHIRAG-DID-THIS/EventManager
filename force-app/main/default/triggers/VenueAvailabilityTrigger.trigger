trigger VenueAvailabilityTrigger on Venue__c (after update) {
    EventCompanyAvailabilityChecker.updateEventCompanyAvailability();
}