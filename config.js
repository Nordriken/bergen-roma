// ---------------------------------------------------------------
//  DELT LAGRING
//
//  Så lenge denne filen står urørt, lagres alt bare i nettleseren
//  din (localStorage). Appen virker, men ingen andre ser tallene.
//
//  For at hele laget skal dele én logg: følg oppskriften i
//  README.md, og lim inn firebase-objektet ditt under.
//  Bytt altså ut  null  med objektet fra Firebase.
// ---------------------------------------------------------------

export const firebaseConfig = null;

/*  Slik ser det ut når det er fylt ut:

export const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "bergen-roma.firebaseapp.com",
  projectId: "bergen-roma",
  storageBucket: "bergen-roma.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};

*/

// Navnet på laget/gruppa. Bytt dette hvis flere klasser skal ha
// hver sin logg i samme Firebase-prosjekt (f.eks. "2hea" og "personalet").
export const lagId = "slaatthaug";
