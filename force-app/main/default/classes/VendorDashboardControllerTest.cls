@isTest
private class VendorDashboardControllerTest {

    @TestSetup
    static void makeData() {
        // User and Company
        Id vendorRecordTypeId = Schema.SObjectType.UserData__c.getRecordTypeInfosByName().get('Vendor').getRecordTypeId();
        UserData__c testUser = new UserData__c(RecordTypeId = vendorRecordTypeId, First_Name__c = 'Test', Last_Name__c = 'Vendor', Email__c = 'vendor@test.com');
        insert testUser;

        EventComapny__c testCompany = new EventComapny__c(Company_Name__c = 'Ultimate Events', Userdata__c = testUser.Id);
        insert testCompany;

        // Venues
        List<Venue__c> venues = new List<Venue__c>{
            new Venue__c(VenueName__c = 'The Grand Ballroom', Location__c = 'Mumbai', Capacity__c = 250),
            new Venue__c(VenueName__c = 'Seaside Conference Hall', Location__c = 'Goa', Capacity__c = 150),
            new Venue__c(VenueName__c = 'The Mumbai Pavilion', Location__c = 'Mumbai', Capacity__c = 400)
        };
        insert venues;

        // Services
        EventServices__c testService = new EventServices__c(
            EventComapny__c = testCompany.Id,
            Service_Type__c = 'Catering',
            Price__c = 5000
        );
        insert testService;
        
        // Bookings (Past and Future)
        Package__c futurePackage = new Package__c(
            EventComapny__c = testCompany.Id, 
            Venue__c = venues[0].Id, 
            EventServices__c = testService.Id,
            StartDate__c = Date.today().addDays(30), 
            EndDate__c = Date.today().addDays(32)
        );
        insert futurePackage;
        // CORRECTED: Added the required EventDate__c field
        Booking__c futureBooking = new Booking__c(Package__c = futurePackage.Id, UserData__c = testUser.Id, EventDate__c = futurePackage.StartDate__c);
        insert futureBooking;

        Package__c pastPackage = new Package__c(
            EventComapny__c = testCompany.Id, 
            Venue__c = venues[1].Id, 
            EventServices__c = testService.Id,
            StartDate__c = Date.today().addDays(-30), 
            EndDate__c = Date.today().addDays(-28)
        );
        insert pastPackage;
        // CORRECTED: Added the required EventDate__c field
        Booking__c pastBooking = new Booking__c(Package__c = pastPackage.Id, UserData__c = testUser.Id, EventDate__c = pastPackage.StartDate__c);
        insert pastBooking;
    }

    // --- COMPANY DETAILS TESTS ---
    @isTest
    static void testGetCompanyDetails() {
        EventComapny__c company = [SELECT Id FROM EventComapny__c LIMIT 1];
        
        Test.startTest();
        EventComapny__c result = VendorDashboardController.getCompanyDetails(company.Id);
        Test.stopTest();

        System.assertNotEquals(null, result);
        System.assertEquals(company.Id, result.Id);
    }

    // --- VENUE MANAGEMENT TESTS ---
    @isTest
    static void testSearchVenues() {
        Test.startTest();
        List<Venue__c> results = VendorDashboardController.searchVenues('Mumbai');
        Test.stopTest();

        System.assertEquals(2, results.size());
    }
    
    @isTest
    static void testCreateVenue() {
        Venue__c newVenue = new Venue__c(VenueName__c = 'Rooftop Lounge', Location__c = 'Delhi', Capacity__c = 100);
        
        Test.startTest();
        Venue__c result = VendorDashboardController.createVenue(newVenue);
        Test.stopTest();

        System.assertNotEquals(null, result.Id);
        Venue__c queriedVenue = [SELECT Id FROM Venue__c WHERE Id = :result.Id];
        System.assertNotEquals(null, queriedVenue);
    }

    @isTest
    static void testLinkVenueToPlanner_Success() {
        EventComapny__c company = [SELECT Id FROM EventComapny__c LIMIT 1];
        Venue__c venue = [SELECT Id FROM Venue__c WHERE VenueName__c = 'The Grand Ballroom' LIMIT 1];
        
        Test.startTest();
        Planner_Venue__c result = VendorDashboardController.linkVenueToPlanner(company.Id, venue.Id, 50000);
        Test.stopTest();

        System.assertNotEquals(null, result);
        System.assertEquals(company.Id, result.EventComapny__c);
    }

    @isTest
    static void testLinkVenueToPlanner_ThrowsExceptionOnDuplicate() {
        EventComapny__c company = [SELECT Id FROM EventComapny__c LIMIT 1];
        Venue__c venue = [SELECT Id FROM Venue__c WHERE VenueName__c = 'The Grand Ballroom' LIMIT 1];
        VendorDashboardController.linkVenueToPlanner(company.Id, venue.Id, 50000);

        Exception caughtException = null;
        Test.startTest();
        try {
            VendorDashboardController.linkVenueToPlanner(company.Id, venue.Id, 50000);
        } catch (AuraHandledException e) {
            caughtException = e;
        }
        Test.stopTest();

        System.assertNotEquals(null, caughtException);
        System.assert(caughtException.getMessage().contains('You have already added this venue.'));
    }

    @isTest
    static void testGetVendorVenues() {
        EventComapny__c company = [SELECT Id FROM EventComapny__c LIMIT 1];
        Venue__c venue = [SELECT Id FROM Venue__c LIMIT 1];
        insert new Planner_Venue__c(EventComapny__c = company.Id, Venue__c = venue.Id, Price__c = 100);

        Test.startTest();
        List<Planner_Venue__c> results = VendorDashboardController.getVendorVenues(company.Id);
        Test.stopTest();
    
        System.assertEquals(1, results.size());
        System.assertEquals(venue.Id, results[0].Venue__r.Id);
    }

    @isTest
    static void testGetVenueById() {
        Venue__c venue = [SELECT Id FROM Venue__c LIMIT 1];

        Test.startTest();
        Venue__c result = VendorDashboardController.getVenueById(venue.Id);
        Test.stopTest();
        
        System.assertNotEquals(null, result);
        System.assertEquals(venue.Id, result.Id);
    }

    // --- SERVICE MANAGEMENT TESTS ---
    @isTest
    static void testGetServicePicklistValues() {
        Test.startTest();
        Map<String, List<String>> result = VendorDashboardController.getServicePicklistValues();
        Test.stopTest();

        System.assertNotEquals(null, result);
        System.assert(result.containsKey('Service_Type__c'));
        System.assert(result.containsKey('Service_SubType__c_All'));
    }
    
    @isTest
    static void testCreateService() {
        EventComapny__c company = [SELECT Id FROM EventComapny__c LIMIT 1];
        
        Test.startTest();
        // **FIX:** Changed 'Decorations' to 'Catering' (a valid value from makeData)
        EventServices__c result = VendorDashboardController.createService(company.Id, 'Catering', 'Veg Buffet', '15000');
        Test.stopTest();

        System.assertNotEquals(null, result.Id);
        System.assertEquals(15000, result.Price__c);
    }

    @isTest
    static void testGetVendorServices() {
        EventComapny__c company = [SELECT Id FROM EventComapny__c LIMIT 1];
        
        Test.startTest();
        List<EventServices__c> results = VendorDashboardController.getVendorServices(company.Id);
        Test.stopTest();

        System.assertEquals(1, results.size());
    }

    // --- AVAILABILITY & BOOKINGS TESTS ---
    @isTest
    static void testSetUnavailability() {
        Venue__c venue = [SELECT Id FROM Venue__c LIMIT 1];
        Date startDate = Date.today().addDays(5);
        Date endDate = Date.today().addDays(7);
        
        Test.startTest();
        Availabilty__c result = VendorDashboardController.setUnavailability(venue.Id, startDate, endDate);
        Test.stopTest();

        System.assertNotEquals(null, result.Id);
        System.assertEquals(venue.Id, result.Venue__c);
    }
    
    @isTest
    static void testGetUpcomingBookings() {
        EventComapny__c company = [SELECT Id FROM EventComapny__c LIMIT 1];

        Test.startTest();
        List<Booking__c> results = VendorDashboardController.getUpcomingBookings(company.Id);
        Test.stopTest();

        System.assertEquals(1, results.size(), 'Should only return the one upcoming booking.');
    }
}