public with sharing class BookingController {
    /**
     * @description Creates a Booking__c record from current user's Cart__c and returns the Booking Id.
     */
    @AuraEnabled
    public static Id createBookingFromCart(Date eventDate) {
        // Validate input
        if (eventDate == null) {
            throw new AuraHandledException('Event Date is required');
        }

        // Get current user's open cart
        Cart__c cart = [
            SELECT Id, User__c, Status__c
            FROM Cart__c
            WHERE User__c = :UserInfo.getUserId() AND Status__c = 'Open'
            LIMIT 1
        ];

        // Get items to compute total and snapshot
        List<Cart_Item__c> items = [
            SELECT Id, Service__c, Quantity__c, UnitPrice__c
            FROM Cart_Item__c
            WHERE Cart__c = :cart.Id
        ];

        if (items.isEmpty()) {
            throw new AuraHandledException('Your cart is empty');
        }

        Decimal total = 0;
        List<Map<String, Object>> details = new List<Map<String, Object>>();
        for (Cart_Item__c ci : items) {
            Decimal qty = (ci.Quantity__c == null) ? 0 : ci.Quantity__c;
            Decimal price = (ci.UnitPrice__c == null) ? 0 : ci.UnitPrice__c;
            Decimal lineTotal = qty * price;
            total += lineTotal;
            Map<String, Object> row = new Map<String, Object>();
            row.put('Service__c', ci.Service__c);
            row.put('Quantity__c', ci.Quantity__c);
            row.put('UnitPrice__c', ci.UnitPrice__c);
            row.put('LineTotal', lineTotal);
            details.add(row);
        }

        // Create booking
        Booking__c booking = new Booking__c();
        booking.User__c = cart.User__c;
        booking.Cart__c = cart.Id;
        booking.Status__c = 'Pending';
        booking.EventDate__c = eventDate;
        booking.Total_Amount__c = total;
        booking.Booking_Details__c = JSON.serialize(details);
        insert booking;

        // Optionally create a pending Payment__c stub (no real gateway integration yet)
        Payment__c payment = new Payment__c();
        payment.Booking__c = booking.Id;
        payment.Amount__c = total;
        payment.Payment_Method__c = 'Card';
        payment.Status__c = 'Pending';
        payment.Payment_Date__c = System.now();
        insert payment;

        // Close cart
        cart.Status__c = 'Closed';
        update cart;

        return booking.Id;
    }

    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getBookingSummary(Id bookingId) {
        if (bookingId == null) {
            throw new AuraHandledException('Booking Id is required');
        }
        Booking__c b = [
            SELECT Id, Status__c, Total_Amount__c, EventDate__c, Booking_Details__c
            FROM Booking__c
            WHERE Id = :bookingId
            LIMIT 1
        ];
        Map<String, Object> result = new Map<String, Object>();
        result.put('Id', b.Id);
        result.put('Status__c', b.Status__c);
        result.put('Total_Amount__c', b.Total_Amount__c);
        result.put('EventDate__c', b.EventDate__c);
        List<Object> items = new List<Object>();
        if (b.Booking_Details__c != null) {
            Object deser = JSON.deserializeUntyped(b.Booking_Details__c);
            if (deser instanceof List<Object>) {
                items = (List<Object>) deser;
            }
        }
        result.put('Items', items);
        return result;
    }

    @AuraEnabled
    public static String confirmPayment(Id bookingId, String transactionId, String paymentMethod) {
        if (bookingId == null) {
            throw new AuraHandledException('Booking Id is required');
        }
        Booking__c b = [
            SELECT Id, Status__c
            FROM Booking__c
            WHERE Id = :bookingId
            LIMIT 1
        ];
        if (b.Status__c == 'Cancelled') {
            throw new AuraHandledException('Booking is cancelled');
        }
        Payment__c p = [
            SELECT Id, Status__c
            FROM Payment__c
            WHERE Booking__c = :bookingId
            ORDER BY CreatedDate DESC
            LIMIT 1
        ];
        p.Status__c = 'Successful';
        p.Transaction_Id__c = transactionId;
        if (paymentMethod != null) {
            p.Payment_Method__c = paymentMethod;
        }
        p.Payment_Date__c = System.now();
        update p;

        b.Status__c = 'Confirmed';
        update b;
        return 'success';
    }
}