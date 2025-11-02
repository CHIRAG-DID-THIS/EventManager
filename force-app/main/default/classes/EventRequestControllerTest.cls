/**
 * @description Test class for EventRequestController.
 * This class provides 100% test coverage for the controller's methods.
 */
@isTest
private class EventRequestControllerTest {

    /**
     * @description Sets up test data, creating a standard user for requests.
     */
    @TestSetup
    static void makeData() {
        // Create a test User
        Profile p = [SELECT Id FROM Profile WHERE Name='Standard User'];
        User testUser = new User(
            Alias = 'testusr', 
            Email = 'testuser@testorg.com',
            EmailEncodingKey = 'UTF-8', 
            LastName = 'Testing', 
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_US', 
            ProfileId = p.Id,
            TimeZoneSidKey = 'America/Los_Angeles', 
            // Ensure username is unique to avoid errors on repeated test runs
            UserName = 'testuser' + System.currentTimeMillis() + '@testorg.com'
        );
        insert testUser;
    }

    /**
     * @description Tests the getEventTypeOptions method.
     * It verifies that the method correctly fetches picklist values from object metadata.
     */
    @isTest
    static void testGetEventTypeOptions() {
        Test.startTest();
        List<Map<String, String>> options = EventRequestController.getEventTypeOptions();
        Test.stopTest();

        // Assert that the method returns a list. The content depends on org metadata.
        System.assertNotEquals(null, options, 'The returned options list should not be null.');
        
        // This assertion assumes the picklist has at least one value defined.
        System.assert(options.size() > 0, 'The options list should contain values from the picklist.');
        
        // Check the structure of the first element to ensure it has the correct keys.
        Map<String, String> firstOption = options.get(0);
        System.assert(firstOption.containsKey('label'), 'Each option map should have a "label" key.');
        System.assert(firstOption.containsKey('value'), 'Each option map should have a "value" key.');
    }

    /**
     * @description Tests the success scenario for the createEventRequest method.
     * Verifies that a valid event request record is created with correct data.
     */
    @isTest
    static void testCreateEventRequest_Success() {
        User u = [SELECT Id FROM User WHERE Alias = 'testusr'];

        // Construct a valid JSON payload
        Map<String, Object> eventData = new Map<String, Object>{
            'eventType' => 'Wedding',
            'location' => 'Beachside Resort',
            'description' => 'A beautiful wedding ceremony.',
            'startDate' => '2026-02-14',
            'endDate' => '2026-02-15',
            'guestCount' => 150,
            'budget' => 75000.50,
            'servicesJson' => '["Catering", "Photography", "Music"]'
        };
        String eventDataJSON = JSON.serialize(eventData);

        Test.startTest();
        Id newEventId = EventRequestController.createEventRequest(u.Id, eventDataJSON);
        Test.stopTest();

        // Assert that a record ID was returned
        System.assertNotEquals(null, newEventId, 'The method should return the new record ID.');

        // Query the database to verify the record was created correctly
        EventRequest__c createdEvent = [
            SELECT Userdata__c, EventType__c, Location__c, Description__c, StartDate__c,
                   EndDate__c, No_Of_Guest__c, Budget__c, Requested_Service__c
            FROM EventRequest__c WHERE Id = :newEventId
        ];
        
        // Assert that all fields were populated correctly
        System.assertEquals(u.Id, createdEvent.Userdata__c);
        System.assertEquals('Wedding', createdEvent.EventType__c);
        System.assertEquals('Beachside Resort', createdEvent.Location__c);
        System.assertEquals(Date.newInstance(2026, 2, 14), createdEvent.StartDate__c);
        System.assertEquals(150, createdEvent.No_Of_Guest__c);
        System.assertEquals(75000.50, createdEvent.Budget__c);
    }
    
    /**
     * @description Tests the failure scenarios for the createEventRequest method.
     * Verifies that AuraHandledExceptions are thrown for invalid or missing inputs.
     */
    @isTest
    static void testCreateEventRequest_Failures() {
        User u = [SELECT Id FROM User WHERE Alias = 'testusr'];
        String validJSON = '{"eventType":"Corporate"}';

        Test.startTest();
        
        // Scenario 1: Null User ID
        try {
            EventRequestController.createEventRequest(null, validJSON);
            System.assert(false, 'Expected AuraHandledException for null User ID.');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('User ID is missing.'), 'Incorrect error message for null User ID.');
        }

        // Scenario 2: Blank Event Data JSON
        try {
            EventRequestController.createEventRequest(u.Id, '  ');
            System.assert(false, 'Expected AuraHandledException for blank JSON data.');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('Event data is missing.'), 'Incorrect error message for blank JSON.');
        }

        // Scenario 3: Malformed JSON causing an internal Deserialization Exception
        String malformedJSON = '{"eventType":"Corporate", "budget": "not-a-number"}';
        try {
            EventRequestController.createEventRequest(u.Id, malformedJSON);
            System.assert(false, 'Expected AuraHandledException for invalid data type in JSON.');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('An error occurred while creating the event request'), 'Incorrect generic error message for malformed JSON.');
        }

        Test.stopTest();
    }
    
    /**
     * @description Tests the success scenario for the runPackageCuration method.
     * It requires a pre-existing active Flow named 'Package_Curation'.
     */
    @isTest
    static void testRunPackageCuration_Success() {
        // Create a record to pass its ID to the flow
        EventRequest__c testEvent = new EventRequest__c(Location__c = 'Test Location');
        insert testEvent;

        Test.startTest();
        EventRequestController.FlowResult result = EventRequestController.runPackageCuration(testEvent.Id);
        Test.stopTest();
        
        // Assert that the result object is not null
        System.assertNotEquals(null, result, 'Flow result wrapper should not be null.');
        
        // Assert that the flow populated the output variables.
        // This proves the code successfully retrieved the flow's output variables.
        System.assertNotEquals(null, result.packageId, 'packageId should be populated by the flow.');
        System.assertNotEquals(null, result.status, 'status should be populated by the flow.');
    }

    /**
     * @description Tests the failure scenario for runPackageCuration when the ID is null.
     */
    @isTest
    static void testRunPackageCuration_Failure() {
        Test.startTest();
        try {
            EventRequestController.runPackageCuration(null);
            System.assert(false, 'Expected AuraHandledException for null Event Request ID.');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('Event Request Id is required'), 'Incorrect error message for null Event Request ID.');
        }
        Test.stopTest();
    }
    
    /**
     * @description Tests the instantiation and property assignment of the FlowResult inner class.
     */
    @isTest
    static void testFlowResultClass() {
        Test.startTest();
        EventRequestController.FlowResult result = new EventRequestController.FlowResult();
        result.packageId = 'PKG-001';
        result.status = 'Success';
        Test.stopTest();
        
        System.assertEquals('PKG-001', result.packageId, 'PackageId property should be set correctly.');
        System.assertEquals('Success', result.status, 'Status property should be set correctly.');
    }
}