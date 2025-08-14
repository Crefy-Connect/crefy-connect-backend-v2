import axios from 'axios'
import logger from './logger.js'
import { GoogleConfig } from 'src/config/index.js'

/**
 * Get user info with authorization code (using access token and 'postmessage' redirect)
 * FETCHES user data from google from an authorizationCode
 */
export const getGoogleUserInfo = async (authorizationCode: string) => {
  try {
    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        code: authorizationCode,
        client_id: GoogleConfig.clientID,
        client_secret: GoogleConfig.clientSecret,
        redirect_uri: 'postmessage',
        grant_type: 'authorization_code',
      },
    )

    const accessToken = tokenResponse.data.access_token

    // Fetch user details using the access token
    const userResponse = await axios.get(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    const userDetails = userResponse.data

    return {
      status: 'success',
      data: {
        googleId: userDetails.sub,
        email: userDetails.email,
        name: userDetails.name,
        picture: userDetails.picture,
        email_verified: userDetails.email_verified,
      },
    }
  } catch (error: any) {
    logger.error(`Error getting Google user info: ${error}`)
    return {
      status: 'error',
      message: 'Failed to get Google user info',
      details: error.response?.data || error.message,
    }
  }
}
