import { Shippo } from 'shippo';

const shippo = new Shippo({ apiKeyHeader: process.env.SHIPPO_API_TOKEN || '' });

export const createShipment = async (addressFrom: any, addressTo: any, parcels: any[]) => {
  try {
    const response = await fetch('https://api.goshippo.com/shipments/', {
      method: 'POST',
      headers: {
        'Authorization': `ShippoToken ${process.env.SHIPPO_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        address_from: {
          name: "LANForge",
          street1: "88 Sabal Creek Trl",
          city: "Ponte Vedra",
          state: "FL",
          zip: "32081",
          country: "US"
        },
        address_to: addressTo,
        parcels: parcels.map(p => {
          const parcelData = {
            length: String(p.length || p.length_in || "5"),
            width: String(p.width || p.width_in || "5"),
            height: String(p.height || p.height_in || "5"),
            distance_unit: String(p.distance_unit || p.distanceUnit || "in"),
            weight: String(p.weight || "2"),
            mass_unit: String(p.mass_unit || p.massUnit || "lb")
          };
          console.log("Shippo Sending Parcel Data:", JSON.stringify(parcelData, null, 2));
          return parcelData;
        }),
        carrier_accounts: [
          "f5af2b1f4fe54476b103493f3e76c27b"
        ],
        async: false
      })
    });

    const dataText = await response.text();
    console.log("Shippo Response:", dataText);

    if (!response.ok) {
      throw new Error(`Shippo API Error: ${dataText}`);
    }

    return JSON.parse(dataText);
  } catch (error: any) {
    throw new Error(`Failed to create shipment: ${error.message}`);
  }
};

export const getLiveRates = async (addressTo: any, lineItems: any[]) => {
  try {
    const response = await fetch('https://api.goshippo.com/live-rates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `ShippoToken ${process.env.SHIPPO_API_TOKEN}`
      },
      body: JSON.stringify({
        address_to: addressTo,
        line_items: lineItems
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Shippo Live Rates Error: ${errorData}`);
    }

    return await response.json();
  } catch (error: any) {
    throw new Error(`Failed to fetch live rates: ${error.message}`);
  }
};

export const purchaseLabel = async (rateObjectId: string) => {
  try {
    return await shippo.transactions.create({
      rate: rateObjectId,
      labelFileType: 'PDF',
      async: false,
    });
  } catch (error: any) {
    throw new Error(`Failed to purchase label: ${error.message}`);
  }
};

export const trackShipment = async (carrier: string, trackingNumber: string) => {
  try {
    return await shippo.trackingStatus.get(carrier, trackingNumber);
  } catch (error: any) {
    throw new Error(`Failed to track shipment: ${error.message}`);
  }
};

export const getRates = async (shipmentObjectId: string) => {
  try {
    // Newer shippo SDK doesn't expose rates through shipments.rates directly, 
    // but typically get() on a shipment returns rates.
    return await shippo.shipments.get(shipmentObjectId);
  } catch (error: any) {
    throw new Error(`Failed to get rates: ${error.message}`);
  }
};
