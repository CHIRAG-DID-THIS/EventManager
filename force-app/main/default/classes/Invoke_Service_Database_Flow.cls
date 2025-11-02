public class Invoke_Service_Database_Flow {
    public static void invokeFlowWithList(/*String userId,String inputList*/) {
        try {
            // The inputs are hardcoded - get it from lwc
            String inputList = '[Cleaning-Home-5, Plumbing-Kitchen-2, Electrical-Office-3, Gardening-Outdoor, Painting--4, Security-Entrance-]';
			String userId='User-003';
            // Create an instance of the Flow
            Flow.Interview interview = Flow.Interview.createInterview('ServicesToDatabase', new Map<String, Object>{
                'ListInput' => inputList,
                'UserId' => userId
            });
            // Start the flow
            interview.start();
            // Get the output variable
            Object parsedJson = interview.getVariableValue('JsonResult');
            System.debug('Flow Output - JsonResult: ' + parsedJson);
            
        } catch (Exception e) {
            System.debug('Flow invocation failed: ' + e.getMessage());
        }
    }
}