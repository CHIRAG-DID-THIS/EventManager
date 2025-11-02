public class VenueAvailabilityChecker {
    public static void updateVenueAvailability() {
        Date today = Date.today();

        // Get all Availability records for today
        List<Availabilty__c> todaysBookings = [
            SELECT Venue__c 
            FROM Availabilty__c 
            WHERE StartDate__c <= :today AND EndDate__c >= :today
        ];

        Set<Id> bookedVenueIds = new Set<Id>();
        for (Availabilty__c booking : todaysBookings) {
            if (booking.Venue__c != null) {
                bookedVenueIds.add(booking.Venue__c);
            }
        }

        // Get all venues
        List<Venue__c> allVenues = [SELECT Id, Unavailable__c FROM Venue__c];

        for (Venue__c venue : allVenues) {
            venue.Unavailable__c = bookedVenueIds.contains(venue.Id);
        }

        update allVenues;
    }
}