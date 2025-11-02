public class PackageProcessorFlow {

    // Input from Flow (No changes here)
    public class FlowInput {
        @InvocableVariable(required=true)
        public String packageJSON;
    }

    public class FlowResult {
        @InvocableVariable
        public String packageId; 
        
        @InvocableVariable
        public String status;
    }

    // --- JSON Structure Classes (No changes here) ---
    public class PackageJSON {
        public PackageDetail best;
        public List<PackageDetail> alternatives;
    }
    public class PackageDetail {
        public String packageId;
        public String packageName;
        public String eventPlanner;
        public String plannerId;
        public String Name;
        public Integer plannerExperienceYears;
        public VenueDetail venue;
        public List<ServiceItem> selectedServices; 
        public CostsDetail costs;
        public Boolean withinBudget;
        public Boolean overBudget;
        public String rationale;
    }
    public class VenueDetail {
        public String venueName;
        public String location;
        public Decimal venuePrice;
        public Integer capacity;
        public String Name;
        public String venueId;
        public Boolean unavailable;
    }
    public class ServiceItem {
        public String serviceName;
        public String serviceType;
        public String serviceSubType;
        public Integer units;
        public String serviceId;
        public Decimal pricePerUnit;
        public Decimal total;
    }
    public class CostsDetail {
        public Decimal venue;
        public Decimal serviceCost;
        public Decimal packageTotalCost;
        public Decimal computedTotalCost;
        public Integer guests;
    }

    @InvocableMethod(label='Create Packages from JSON' description='Creates Package__c records from AI JSON output')
    public static List<FlowResult> createPackagesFromJSON(List<FlowInput> inputs) {
        List<FlowResult> results = new List<FlowResult>();

        for(FlowInput input : inputs) {
            FlowResult res = new FlowResult(); // Define result object at the start
            try {
                PackageJSON parsed = (PackageJSON) JSON.deserialize(input.packageJSON, PackageJSON.class);

                List<PackageDetail> allPackages = new List<PackageDetail>();
                if(parsed.best != null) allPackages.add(parsed.best);
                if(parsed.alternatives != null) allPackages.addAll(parsed.alternatives);

                List<Package__c> packagesToInsert = new List<Package__c>();

                for(PackageDetail pkgDetail : allPackages) {
                    Id plannerId = (pkgDetail.plannerId != null) ? Id.valueOf(pkgDetail.plannerId) : null;
                    Id venueId = (pkgDetail.venue != null && pkgDetail.venue.venueId != null) ? Id.valueOf(pkgDetail.venue.venueId) : null;

                    String serviceJSON = JSON.serializePretty(pkgDetail.selectedServices);

                    Package__c pkg = new Package__c();
                    pkg.EventComapny__c = plannerId;
                    pkg.Venue__c = venueId;
                    pkg.TotalCost__c = (pkgDetail.costs != null && pkgDetail.costs.serviceCost != null) 
                        ? pkgDetail.costs.serviceCost : 0;
                    pkg.StartDate__c = Date.today();
                    pkg.EndDate__c = Date.today().addDays(1);
                    pkg.Services__c = serviceJSON;
                    
                    if (pkgDetail.selectedServices != null && !pkgDetail.selectedServices.isEmpty()) {
                        pkg.EventServices__c = Id.valueOf(pkgDetail.selectedServices[0].serviceId);
                    }

                    packagesToInsert.add(pkg);
                }

                if(!packagesToInsert.isEmpty()) {
                    insert packagesToInsert;
                }

                List<String> createdPackageIds = new List<String>();
                for (Package__c createdPkg : packagesToInsert) {
                    createdPackageIds.add(createdPkg.Id);
                }

                // ========================= UPDATED LINE BELOW =========================
                // Join the list of IDs into a single, hyphen-separated string
                res.packageId = String.join(createdPackageIds, '-');
                // ====================================================================
                
                res.status = 'Success';

            } catch(Exception e) {
                res.status = 'Error: ' + e.getMessage() + ' on line ' + e.getLineNumber();
                res.packageId = null; // Return null on error
            }
            results.add(res); // Add the result (success or error) to the list to be returned
        }
        return results;
    }
}