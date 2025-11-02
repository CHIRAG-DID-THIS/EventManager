public class VenueAvailabilityScheduler {
   
    public void execute(SchedulableContext sc) {
        VenueAvailabilityChecker.updateVenueAvailability();
    }
}