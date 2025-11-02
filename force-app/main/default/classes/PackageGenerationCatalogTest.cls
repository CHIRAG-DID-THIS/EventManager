@isTest
private class PackageGenerationCatalogTest {

    @TestSetup
    static void makeData() {
        // STEP 1: Create UserData records
        Id vendorRecordTypeId = Schema.SObjectType.UserData__c.getRecordTypeInfosByName().get('Vendor').getRecordTypeId();
        List<UserData__c> users = new List<UserData__c>{
            new UserData__c(RecordTypeId = vendorRecordTypeId, First_Name__c = 'Elite', Last_Name__c = 'User', Email__c = 'elite@test.com'),
            new UserData__c(RecordTypeId = vendorRecordTypeId, First_Name__c = 'Corporate', Last_Name__c = 'User', Email__c = 'corp@test.com')
        };
        insert users;
    
        // STEP 2: Create Event Companies
        List<EventComapny__c> companies = new List<EventComapny__c>{
            new EventComapny__c(Company_Name__c = 'Elite Weddings Co.', City__c = 'Mumbai', Userdata__c = users[0].Id),
            new EventComapny__c(Company_Name__c = 'Corporate Kings Inc.', City__c = 'Pune', Userdata__c = users[1].Id)
        };
        insert companies;
    
        // STEP 3: Create Venues
        List<Venue__c> venues = new List<Venue__c>{
            new Venue__c(VenueName__c = 'Sea View Banquet', Location__c = 'Mumbai', Capacity__c = 200),
            new Venue__c(VenueName__c = 'Grand Convention Hall', Location__c = 'Mumbai', Capacity__c = 500),
            new Venue__c(VenueName__c = 'Hilltop Gardens', Location__c = 'Pune', Capacity__c = 150)
        };
        insert venues;
    
        // STEP 4: Link Companies and Venues
        EventComapny__c eliteWeddings = [SELECT Id FROM EventComapny__c WHERE Company_Name__c = 'Elite Weddings Co.' LIMIT 1];
        EventComapny__c corpKings = [SELECT Id FROM EventComapny__c WHERE Company_Name__c = 'Corporate Kings Inc.' LIMIT 1];
        Venue__c seaView = [SELECT Id FROM Venue__c WHERE VenueName__c = 'Sea View Banquet' LIMIT 1];
        Venue__c hillTop = [SELECT Id FROM Venue__c WHERE VenueName__c = 'Hilltop Gardens' LIMIT 1];
    
        List<Planner_Venue__c> plannerVenues = new List<Planner_Venue__c>{
            new Planner_Venue__c(EventComapny__c = eliteWeddings.Id, Venue__c = seaView.Id, Price__c = 50000),
            new Planner_Venue__c(EventComapny__c = eliteWeddings.Id, Venue__c = hillTop.Id, Price__c = 75000),
            new Planner_Venue__c(EventComapny__c = corpKings.Id, Venue__c = hillTop.Id, Price__c = 80000)
        };
        insert plannerVenues;
    
        // STEP 5: Create Services for the companies
        // TODO: Replace these placeholder values with ACTUAL values from your picklist!
        List<EventServices__c> services = new List<EventServices__c>{
            new EventServices__c(EventComapny__c = eliteWeddings.Id, Price__c = 10000, Service_Type__c = 'Catering'), // e.g., 'Catering'
            new EventServices__c(EventComapny__c = eliteWeddings.Id, Price__c = 5000, Service_Type__c = 'Decoration'), // e.g., 'Music'
            new EventServices__c(EventComapny__c = corpKings.Id, Price__c = 7000, Service_Type__c = 'Transport')  // e.g., 'Audiovisual'
        };
        insert services;
    }

    // ... All other test methods remain the same ...

    @isTest
    static void testGenerateCatalog_HappyPath_MultipleLocations() {
        String jsonInput = '{"validLocations": ["Mumbai", "Pune"]}';
        List<String> inputs = new List<String>{jsonInput};

        Test.startTest();
        List<String> results = Package_Generation_Catalog.generateCatalog(inputs);
        Test.stopTest();

        System.assertEquals(1, results.size(), 'Should return one catalog string.');
        List<Object> catalog = (List<Object>) JSON.deserializeUntyped(results[0]);
        System.assertEquals(2, catalog.size(), 'Catalog should contain 2 Event Companies.');
    }

    @isTest
    static void testGenerateCatalog_PartialLocationMatch() {
        String jsonInput = '{"validLocations": ["Pune"]}';
        List<String> inputs = new List<String>{jsonInput};

        Test.startTest();
        List<String> results = Package_Generation_Catalog.generateCatalog(inputs);
        Test.stopTest();
        
        System.assertEquals(1, results.size());
        List<Object> catalog = (List<Object>) JSON.deserializeUntyped(results[0]);
        System.assertEquals(2, catalog.size(), 'Still 2 companies, as both have venues in Pune.');
    }

    @isTest
    static void testGenerateCatalog_NoMatchingLocations() {
        String jsonInput = '{"validLocations": ["Delhi"]}';
        List<String> inputs = new List<String>{jsonInput};

        Test.startTest();
        List<String> results = Package_Generation_Catalog.generateCatalog(inputs);
        Test.stopTest();

        System.assertEquals(1, results.size());
        System.assertEquals('[]', results[0].normalizeSpace(), 'Result for no matches should be an empty JSON array.');
    }
    
    @isTest
    static void testGenerateCatalog_BulkRequest() {
        String jsonInputPune = '{"validLocations": ["Pune"]}';
        String jsonInputDelhi = '{"validLocations": ["Delhi"]}';
        List<String> inputs = new List<String>{jsonInputPune, jsonInputDelhi};

        Test.startTest();
        List<String> results = Package_Generation_Catalog.generateCatalog(inputs);
        Test.stopTest();

        System.assertEquals(2, results.size(), 'Should return two result strings, one for each input.');
        List<Object> catalogPune = (List<Object>) JSON.deserializeUntyped(results[0]);
        System.assertEquals(2, catalogPune.size(), 'First result for Pune should have 2 companies.');
        System.assertEquals('[]', results[1].normalizeSpace(), 'Second result for Delhi should be an empty JSON array.');
    }

    private static Map<String, Object> findCompanyInCatalog(List<Object> catalog, String companyName) {
        for (Object item : catalog) {
            Map<String, Object> entry = (Map<String, Object>) item;
            Map<String, Object> company = (Map<String, Object>) entry.get('EventCompany');
            if (company != null && company.get('Company_Name') == companyName) {
                return company;
            }
        }
        return null;
    }
}