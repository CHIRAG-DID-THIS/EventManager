public class GetAvailability {

    // Required dummy input wrapper for Flow
    public class RequestWrapper {
        @InvocableVariable(label='Dummy Input')
        public String dummyInput;
    }

    // Output wrapper for Flow
    public class ResponseWrapper {
        @InvocableVariable(label='JSON Output')
        public String jsonOutput;
    }

    @InvocableMethod(label='Get All Availability Records as JSON')
    public static List<ResponseWrapper> fetchAllAvailabilityRecords(List<RequestWrapper> input) {
        List<ResponseWrapper> responses = new List<ResponseWrapper>();
        ResponseWrapper response = new ResponseWrapper();

        // Query all records from Availability__c
        List<Availabilty__c> records = [
            SELECT Id, Name,	Venue__c,	StartDate__c , 	EndDate__c
            FROM Availabilty__c
        ];

        // Serialize list into JSON array
        response.jsonOutput = JSON.serialize(records);

        responses.add(response);
        return responses;
    }

}