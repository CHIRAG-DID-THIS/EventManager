public class GetLatestRequest {

    // UPDATED: Input now expects the Event Request ID from the Flow
    public class RequestWrapper {
        @InvocableVariable(label='Event Request ID' required=true)
        public String eventRequestId;
    }

    // Output wrapper is unchanged
    public class ResponseWrapper {
        @InvocableVariable(label='JSON Output')
        public String jsonOutput;
    }

    // Invocable method
    @InvocableMethod(label='Get Specific Event Request as JSON')
    public static List<ResponseWrapper> fetchSpecificEventRequest(List<RequestWrapper> inputs) {
        List<ResponseWrapper> responses = new List<ResponseWrapper>();
        ResponseWrapper response = new ResponseWrapper();

        // Get the ID passed in from the Flow
        String requestId = inputs[0].eventRequestId;

        List<EventRequest__c> requests = [
            SELECT 
                Id, Name, EventType__c, StartDate__c, EndDate__c,
                Location__c, Budget__c, No_Of_Guest__c, Requested_Service__c,
                Description__c, CreatedDate
            FROM EventRequest__c
            // UPDATED: The query now filters by the specific ID
            WHERE Id = :requestId
            LIMIT 1
        ];

        if (!requests.isEmpty()) {
            EventRequest__c specificRequest = requests[0];
            response.jsonOutput = JSON.serialize(specificRequest);
        } else {
            response.jsonOutput = '{"message": "No record found for the provided ID"}';
        }

        responses.add(response);
        return responses;
    }
}