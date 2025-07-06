import httpx
import base64
from datetime import datetime
from typing import Dict, Any
from app.core.config import settings
import json

class MPesaService:
    def __init__(self):
        self.consumer_key = settings.MPESA_CONSUMER_KEY
        self.consumer_secret = settings.MPESA_CONSUMER_SECRET
        self.passkey = settings.MPESA_PASSKEY
        self.shortcode = settings.MPESA_SHORTCODE
        self.environment = settings.MPESA_ENVIRONMENT
        
        # Set URLs based on environment
        if self.environment == "production":
            self.base_url = "https://api.safaricom.co.ke"
        else:
            self.base_url = "https://sandbox.safaricom.co.ke"
    
    async def get_access_token(self) -> str:
        """Get OAuth access token from M-Pesa API"""
        url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
        
        # Create basic auth header
        credentials = f"{self.consumer_key}:{self.consumer_secret}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()
        
        headers = {
            "Authorization": f"Basic {encoded_credentials}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            return data["access_token"]
    
    async def initiate_stk_push(
        self,
        phone_number: str,
        amount: float,
        account_reference: str,
        transaction_desc: str
    ) -> Dict[str, Any]:
        """Initiate STK Push payment"""
        access_token = await self.get_access_token()
        
        url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"
        
        # Generate timestamp
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        
        # Generate password
        password_string = f"{self.shortcode}{self.passkey}{timestamp}"
        password = base64.b64encode(password_string.encode()).decode()
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(amount),
            "PartyA": phone_number,
            "PartyB": self.shortcode,
            "PhoneNumber": phone_number,
            "CallBackURL": f"{settings.BASE_URL}/api/mpesa/callback",
            "AccountReference": account_reference,
            "TransactionDesc": transaction_desc
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            
            return response.json()
    
    async def query_transaction_status(self, checkout_request_id: str) -> Dict[str, Any]:
        """Query the status of an STK Push transaction"""
        access_token = await self.get_access_token()
        
        url = f"{self.base_url}/mpesa/stkpushquery/v1/query"
        
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        password_string = f"{self.shortcode}{self.passkey}{timestamp}"
        password = base64.b64encode(password_string.encode()).decode()
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": checkout_request_id
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            
            return response.json()
    
    def process_callback(self, callback_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process M-Pesa callback data"""
        stk_callback = callback_data.get("Body", {}).get("stkCallback", {})
        
        result_code = stk_callback.get("ResultCode")
        result_desc = stk_callback.get("ResultDesc")
        checkout_request_id = stk_callback.get("CheckoutRequestID")
        
        if result_code == 0:  # Success
            callback_metadata = stk_callback.get("CallbackMetadata", {}).get("Item", [])
            
            # Extract transaction details
            transaction_data = {}
            for item in callback_metadata:
                name = item.get("Name")
                value = item.get("Value")
                
                if name == "Amount":
                    transaction_data["amount"] = value
                elif name == "MpesaReceiptNumber":
                    transaction_data["mpesa_receipt"] = value
                elif name == "TransactionDate":
                    transaction_data["transaction_date"] = value
                elif name == "PhoneNumber":
                    transaction_data["phone_number"] = value
            
            return {
                "status": "success",
                "checkout_request_id": checkout_request_id,
                "transaction_data": transaction_data
            }
        else:
            return {
                "status": "failed",
                "checkout_request_id": checkout_request_id,
                "error_message": result_desc
            }