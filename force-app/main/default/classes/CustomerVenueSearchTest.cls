@isTest
private class CustomerVenueSearchTest {

    // == TEST SETUP: Create common data for all test methods ==
    @TestSetup
    static void makeData() {
        // Create a set of venues for testing
        List<Venue__c> venuesToCreate = new List<Venue__c>();

        // 1. Available venue in Mumbai with an image
        String imageUrl = 'https://example.com/images/mumbai_hall.jpg';
        String richTextWithImage = '<p>A beautiful hall.</p><img src="' + imageUrl + '" alt="Hall View"/>';
        venuesToCreate.add(new Venue__c(
            VenueName__c = 'Grand Hall Mumbai',
            Location__c = 'Mumbai, Maharashtra',
            Capacity__c = 200,
            Descriptions__c = richTextWithImage,
            Unavailable__c = false
        ));

        // 2. Available venue in Mumbai with NO image
        venuesToCreate.add(new Venue__c(
            VenueName__c = 'City Convention Center',
            Location__c = 'Mumbai, Maharashtra',
            Capacity__c = 500,
            Descriptions__c = '<p>Spacious and modern.</p>', // No img tag
            Unavailable__c = false
        ));

        // 3. Venue in a different location (Pune)
        venuesToCreate.add(new Venue__c(
            VenueName__c = 'Pune Gardens',
            Location__c = 'Pune, Maharashtra',
            Capacity__c = 150,
            Unavailable__c = false
        ));
        
        // 4. An unavailable venue in Mumbai
        venuesToCreate.add(new Venue__c(
            VenueName__c = 'Seaside Resort (Closed)',
            Location__c = 'Mumbai, Maharashtra',
            Capacity__c = 100,
            Unavailable__c = true // This should be filtered out by the query
        ));
        
        insert venuesToCreate;

        // Create a booking for the 'Grand Hall Mumbai' to test date conflicts
        Venue__c bookedVenue = [SELECT Id FROM Venue__c WHERE VenueName__c = 'Grand Hall Mumbai' LIMIT 1];
        
        Availabilty__c booking = new Availabilty__c(
            Venue__c = bookedVenue.Id,
            StartDate__c = Date.newInstance(2025, 10, 15),
            EndDate__c = Date.newInstance(2025, 10, 20)
        );
        insert booking;
    }

    @isTest
    static void testFindVenuesByLocationOnly() {
        // Test searching by location without providing dates.
        Test.startTest();
        List<customervenuesearch.VenueWrapper> results = customervenuesearch.findVenues('Mumbai', null, null);
        Test.stopTest();

        // Should find 2 venues: 'Grand Hall Mumbai' and 'City Convention Center'.
        // The Pune venue and the unavailable Mumbai venue should be excluded.
        System.assertEquals(2, results.size(), 'Expected to find 2 available venues in Mumbai.');
        System.assertEquals('Grand Hall Mumbai', results[0].venueName);
    }

    @isTest
    static void testFindVenuesWithNoDateConflict() {
        // Search for a date range that does NOT conflict with the existing booking.
        Date searchStart = Date.newInstance(2025, 11, 1);
        Date searchEnd = Date.newInstance(2025, 11, 5);
        
        Test.startTest();
        List<customervenuesearch.VenueWrapper> results = customervenuesearch.findVenues('Mumbai', searchStart, searchEnd);
        Test.stopTest();

        // Both available Mumbai venues should be returned as there are no conflicts.
        System.assertEquals(2, results.size(), 'Expected to find 2 available venues for the non-conflicting date range.');
    }

    @isTest
    static void testFindVenuesWithDateConflict() {
        // Search for a date range that directly conflicts with the existing booking (Oct 15-20).
        Date searchStart = Date.newInstance(2025, 10, 18);
        Date searchEnd = Date.newInstance(2025, 10, 22);

        Test.startTest();
        List<customervenuesearch.VenueWrapper> results = customervenuesearch.findVenues('Mumbai', searchStart, searchEnd);
        Test.stopTest();

        // 'Grand Hall Mumbai' is booked, so only 'City Convention Center' should be returned.
        System.assertEquals(1, results.size(), 'Expected only 1 available venue due to the date conflict.');
        System.assertEquals('City Convention Center', results[0].venueName, 'The unbooked venue should be the one returned.');
    }

    @isTest
    static void testFindVenuesNoResults() {
        // Search for a location that has no venues.
        Test.startTest();
        List<customervenuesearch.VenueWrapper> results = customervenuesearch.findVenues('Delhi', null, null);
        Test.stopTest();

        // The list should be empty.
        System.assertEquals(0, results.size(), 'Expected no results for a location with no venues.');
    }

    @isTest
    static void testWrapperClassImageExtraction() {
        // Test the wrapper's logic for parsing the image URL from the rich text field.
        Test.startTest();
        List<customervenuesearch.VenueWrapper> results = customervenuesearch.findVenues('Mumbai', null, null);
        Test.stopTest();

        // Find the specific wrapper for the venue that has an image.
        customervenuesearch.VenueWrapper wrapperWithImage = null;
        for (customervenuesearch.VenueWrapper w : results) {
            if (w.venueName == 'Grand Hall Mumbai') {
                wrapperWithImage = w;
                break;
            }
        }

        System.assertNotEquals(null, wrapperWithImage, 'The wrapper for the venue with an image should be found.');
        
        // Verify the correct URL was extracted.
        String expectedUrl = 'https://example.com/images/mumbai_hall.jpg';
        System.assertEquals(expectedUrl, wrapperWithImage.imageUrl, 'The image URL was not extracted correctly.');
    }

    @isTest
    static void testWrapperClassNoImage() {
        // Test the wrapper's fallback logic when no image tag is present.
        Test.startTest();
        List<customervenuesearch.VenueWrapper> results = customervenuesearch.findVenues('Mumbai', null, null);
        Test.stopTest();

        // Find the specific wrapper for the venue that has NO image.
        customervenuesearch.VenueWrapper wrapperWithoutImage = null;
        for (customervenuesearch.VenueWrapper w : results) {
            if (w.venueName == 'City Convention Center') {
                wrapperWithoutImage = w;
                break;
            }
        }
        
        System.assertNotEquals(null, wrapperWithoutImage, 'The wrapper for the venue without an image should be found.');
        
        // Verify the imageUrl is an empty string as per the fallback logic.
        System.assertEquals('', wrapperWithoutImage.imageUrl, 'The imageUrl should be an empty string when no image is present.');
    }
}