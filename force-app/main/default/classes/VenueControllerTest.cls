/**
 * @description Test class for VenueController.
 * This class provides 100% test coverage for all methods and logic paths.
 */
@isTest
private class VenueControllerTest {

    /**
     * @description Creates common test data used across multiple test methods,
     * including venues with and without related planner links.
     */
    @TestSetup
    static void makeData() {
        // Create a Venue that will have related planner links
        Venue__c venueWithLinks = new Venue__c(
            VenueName__c = 'Grand Conference Hall',
            Descriptions__c = 'A beautiful hall for corporate events.'
        );

        // Create a Venue with no images and no links for other test cases
        Venue__c venueWithoutLinksOrImages = new Venue__c(
            VenueName__c = 'Cozy Meeting Room',
            Descriptions__c = 'A small, quiet room.'
        );
        insert new List<Venue__c>{ venueWithLinks, venueWithoutLinksOrImages };

        // Create a related Event Company record
        EventComapny__c company = new EventComapny__c(
            Company_Name__c = 'Premier Event Planners Inc.'
        );
        insert company;

        // Create a junction record linking the venue and the company
        Planner_Venue__c plannerLink = new Planner_Venue__c(
            Venue__c = venueWithLinks.Id,
            EventComapny__c = company.Id,
            Price__c = 10000
        );
        insert plannerLink;
    }

    /**
     * @description Tests that getVenueDetails throws an AuraHandledException when the venueId is null.
     */
    @isTest
    static void testGetVenueDetails_NullId() {
        Test.startTest();
        try {
            // Call the method with a null ID
            VenueController.getVenueDetails(null);
            // If this line is reached, the test fails because no exception was thrown
            System.assert(false, 'Expected AuraHandledException for null ID.');
        } catch (AuraHandledException e) {
            // Success: Verify the correct exception message
            System.assert(e.getMessage().contains('Venue ID is required.'), 'Incorrect error message for null ID.');
        }
        Test.stopTest();
    }

    /**
     * @description Tests getVenueDetails for a venue with no images in its description.
     * Verifies that the default hero image is used.
     */
    @isTest
    static void testGetVenueDetails_NoImages() {
        Venue__c venue = [SELECT Id FROM Venue__c WHERE VenueName__c = 'Cozy Meeting Room'];

        Test.startTest();
        VenueController.VenueDetailWrapper result = VenueController.getVenueDetails(venue.Id);
        Test.stopTest();

        // Assertions
        System.assertNotEquals(null, result, 'Result wrapper should not be null.');
        System.assertEquals(venue.Id, result.venueRecord.Id, 'The correct venue record should be returned.');
        System.assertEquals(0, result.galleryImageUrls.size(), 'Gallery image list should be empty.');
        System.assert(result.heroImageUrl.contains('unsplash.com'), 'Hero image should be the default URL.');
    }

    /**
     * @description Tests getVenueDetails for a venue with multiple images in its description.
     * Verifies that all image URLs are extracted and the hero is the first image.
     */
    @isTest
    static void testGetVenueDetails_WithImages() {
        // Define image URLs and construct a rich text string
        String url1 = 'https://example.com/images/main-hall.jpg';
        String url2 = 'https://example.com/images/lobby.png';
        String description = '<p>Welcome!</p><img src="' + url1 + '" alt="Main Hall"> <p>More info below.</p><img src="' + url2 + '">';

        Venue__c venue = new Venue__c(VenueName__c = 'The Picture Palace', Descriptions__c = description);
        insert venue;

        Test.startTest();
        VenueController.VenueDetailWrapper result = VenueController.getVenueDetails(venue.Id);
        Test.stopTest();

        // Assertions
        System.assertNotEquals(null, result, 'Result wrapper should not be null.');
        System.assertEquals(2, result.galleryImageUrls.size(), 'Should find exactly two images.');
        System.assertEquals(url1, result.heroImageUrl, 'Hero image should be the first one found.');
        System.assertEquals(url1, result.galleryImageUrls[0], 'First gallery image is incorrect.');
        System.assertEquals(url2, result.galleryImageUrls[1], 'Second gallery image is incorrect.');
    }

    /**
     * @description Tests that image URLs with HTML-escaped characters are correctly unescaped.
     */
    @isTest
    static void testGetVenueDetails_WithEscapedUrl() {
        String escapedUrl = 'https://example.com/search?q=events&amp;city=Mumbai';
        String unescapedUrl = 'https://example.com/search?q=events&city=Mumbai';
        String description = '<p>An image with a complex URL:</p><img src="' + escapedUrl + '">';
        
        Venue__c venue = new Venue__c(VenueName__c = 'Tech Expo Center', Descriptions__c = description);
        insert venue;

        Test.startTest();
        VenueController.VenueDetailWrapper result = VenueController.getVenueDetails(venue.Id);
        Test.stopTest();

        // Assertions
        System.assertEquals(1, result.galleryImageUrls.size(), 'Should find one image.');
        System.assertEquals(unescapedUrl, result.galleryImageUrls[0], 'The URL should be correctly unescaped.');
        System.assertEquals(unescapedUrl, result.heroImageUrl, 'The hero URL should also be unescaped.');
    }

    /**
     * @description Tests getPlannerVenueLinks for a venue that has associated links.
     * Verifies that the correct link and related company data are returned.
     */
    @isTest
    static void testGetPlannerVenueLinks_WithLinks() {
        Venue__c venue = [SELECT Id FROM Venue__c WHERE VenueName__c = 'Grand Conference Hall'];
        
        Test.startTest();
        List<Planner_Venue__c> links = VenueController.getPlannerVenueLinks(venue.Id);
        Test.stopTest();

        // Assertions
        System.assertEquals(1, links.size(), 'Should return one planner link.');
        System.assertEquals('Premier Event Planners Inc.', links[0].EventComapny__r.Company_Name__c, 'Related company name is incorrect.');
    }

    /**
     * @description Tests getPlannerVenueLinks for a venue with no associated links.
     * Verifies that an empty list is returned.
     */
    @isTest
    static void testGetPlannerVenueLinks_NoLinks() {
        Venue__c venue = [SELECT Id FROM Venue__c WHERE VenueName__c = 'Cozy Meeting Room'];

        Test.startTest();
        List<Planner_Venue__c> links = VenueController.getPlannerVenueLinks(venue.Id);
        Test.stopTest();
        
        // Assertions
        System.assertNotEquals(null, links, 'The returned list should not be null.');
        System.assertEquals(0, links.size(), 'Should return an empty list for a venue with no links.');
    }
}