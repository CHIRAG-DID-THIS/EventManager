public class mailingclass {
    
    public static void sendWelcomeEmail(Id userDataId) {
        Userdata__c userData = [
            SELECT First_Name__c, Email__c, RecordType.Name, VendorName__c
            FROM Userdata__c
            WHERE Id = :userDataId
            LIMIT 1
        ];

        if (userData.Email__c == null || userData.RecordType == null) {
            return;
        }

        String subject;
        String body;

        if (userData.RecordType.Name == 'Customer') {
            subject = 'Welcome to Our Event Planning Platform!';
            body = 'Dear ' + userData.First_Name__c + ',\n\n' +
                   'Welcome aboard! As a valued customer, we’re excited to help you plan unforgettable events.\n\n' +
                   'Warm regards,\nEvent Planning Team';
        } else if (userData.RecordType.Name == 'Vendor') {
            subject = 'Welcome ' + userData.VendorName__c + ' – Let’s Create Memorable Events Together!';
            body = 'Dear ' + userData.VendorName__c + ',\n\n' +
                   'Thank you for joining us as a vendor. We look forward to working with you to deliver amazing experiences.\n\n' +
                   'Warm regards,\nEvent Planning Team';
        } else {
            return;
        }

        Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
        mail.setToAddresses(new String[] { userData.Email__c });
        mail.setSubject(subject);
        mail.setPlainTextBody(body);

        Messaging.sendEmail(new Messaging.SingleEmailMessage[] { mail });
    }

   public static void sendBookingMail(Id bookingId) {
    // Step 1: Fetch Booking__c record with related Userdata__c and Package__c
    Booking__c booking = [
        SELECT Id, Userdata__c, Package__c, EventDate__c,
               Userdata__r.Email__c, Userdata__r.First_Name__c,
               Package__r.Name, Package__r.StartDate__c, Package__r.EndDate__c,
               Package__r.TotalCost__c,
               Package__r.Venue__r.VenueName__c,
               Package__r.EventComapny__r.Name,
               Package__r.EventComapny__r.Userdata__r.Email__c,
               Package__r.EventComapny__r.Userdata__r.VendorName__c,
               Package__r.EventServices__r.Service_Type__c
        FROM Booking__c
        WHERE Id = :bookingId
        LIMIT 1
    ];

    // Step 2: Send confirmation mail to customer
    if (booking.Userdata__r.Email__c != null) {
        String customerBody = 'Dear ' + booking.Userdata__r.First_Name__c + ',\n\n' +
            'Thank you for booking with us! Here are your booking details:\n\n' +
            '📦 Package: ' + booking.Package__r.Name + '\n' +
            '📅 Event Date: ' + String.valueOf(booking.EventDate__c) + '\n' +
            '🏨 Venue: ' + booking.Package__r.Venue__r.VenueName__c + '\n' +
            '🕒 Start Date: ' + String.valueOf(booking.Package__r.StartDate__c) + '\n' +
            '🕒 End Date: ' + String.valueOf(booking.Package__r.EndDate__c) + '\n' +
            '💰 Total Cost: ₹' + String.valueOf(booking.Package__r.TotalCost__c) + '\n' +
            '🏢 Event Company: ' + booking.Package__r.EventComapny__r.Name + '\n' +
            '🛎️ Services: ' + booking.Package__r.EventServices__r.Service_Type__c + '\n\n' +
            'We’ll be in touch with further details.\n\nBest regards,\nEvent Planning Team';

        Messaging.SingleEmailMessage customerMail = new Messaging.SingleEmailMessage();
        customerMail.setToAddresses(new String[] { booking.Userdata__r.Email__c });
        customerMail.setSubject('Your Booking Confirmation – ' + booking.Package__r.Name);
        customerMail.setPlainTextBody(customerBody);
        Messaging.sendEmail(new Messaging.SingleEmailMessage[] { customerMail });
    }

    // Step 3: Send mail to vendor
    if (booking.Package__r.EventComapny__r.Userdata__r.Email__c != null) {
        String vendorBody = 'Dear ' + booking.Package__r.EventComapny__r.Userdata__r.VendorName__c + ',\n\n' +
            'A new booking has been made for your package "' + booking.Package__r.Name + '".\n\n' +
            '📅 Event Date: ' + String.valueOf(booking.EventDate__c) + '\n' +
            '🏨 Venue: ' + booking.Package__r.Venue__r.VenueName__c + '\n' +
            '🕒 Start Date: ' + String.valueOf(booking.Package__r.StartDate__c) + '\n' +
            '🕒 End Date: ' + String.valueOf(booking.Package__r.EndDate__c) + '\n' +
            '💰 Total Cost: ₹' + String.valueOf(booking.Package__r.TotalCost__c) + '\n' +
            '🛎️ Services: ' + booking.Package__r.EventServices__r.Service_Type__c + '\n\n' +
            'Please review the details and prepare accordingly.\n\nBest regards,\nEvent Planning Team';

        Messaging.SingleEmailMessage vendorMail = new Messaging.SingleEmailMessage();
        vendorMail.setToAddresses(new String[] { booking.Package__r.EventComapny__r.Userdata__r.Email__c });
        vendorMail.setSubject('New Booking Assigned – ' + booking.Package__r.Name);
        vendorMail.setPlainTextBody(vendorBody);
        Messaging.sendEmail(new Messaging.SingleEmailMessage[] { vendorMail });
    }
}
}