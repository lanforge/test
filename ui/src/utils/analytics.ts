import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from './api';

const isValidObjectId = (value: string) => /^[a-f\d]{24}$/i.test(value);

// Generate or retrieve session ID
export const getSessionId = () => {
  let sessionId = sessionStorage.getItem('lanforge_session_id');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('lanforge_session_id', sessionId);
  }
  return sessionId;
};

// Function to get active discount code
export const getActiveDiscountCode = () => {
  return localStorage.getItem('autoDiscountCode') || undefined;
};

// Base function to track events
export const trackEvent = async (
  eventType: 'page_view' | 'add_to_cart' | 'checkout' | 'other',
  pageUrl: string,
  productId?: string
) => {
  if (pageUrl.startsWith('/admin')) {
    return;
  }

  try {
    const sessionId = getSessionId();
    const discountCode = getActiveDiscountCode();
    const cartSessionId = localStorage.getItem('cartSessionId') || undefined;
    
    let userId = undefined;
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        const storedUserId = user._id || user.id;
        userId = typeof storedUserId === 'string' && isValidObjectId(storedUserId)
          ? storedUserId
          : undefined;
      }
    } catch(e) {}

    await api.post('/analytics/event', {
      sessionId,
      cartSessionId,
      userId,
      eventType,
      pageUrl,
      productId,
      discountCode,
    });
  } catch (error) {
    console.error('Analytics error:', error);
  }
};

// Hook to track page views
export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    trackEvent('page_view', location.pathname + location.search);
  }, [location]);
};
