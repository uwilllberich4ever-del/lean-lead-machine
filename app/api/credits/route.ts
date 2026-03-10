import { NextRequest, NextResponse } from 'next/server';

// Mock user credits data
let userCredits = {
  userId: "user_123",
  balance: 247,
  lastUpdated: new Date().toISOString(),
  history: [
    { id: 1, date: "2026-03-10", description: "Achat pack Pro", amount: 500, type: "credit" },
    { id: 2, date: "2026-03-09", description: "Export CSV (42 entreprises)", amount: -84, type: "debit" },
    { id: 3, date: "2026-03-08", description: "Recherches avancées", amount: -23, type: "debit" },
    { id: 4, date: "2026-03-07", description: "Achat pack Starter", amount: 100, type: "credit" },
    { id: 5, date: "2026-03-06", description: "Fiches entreprises", amount: -45, type: "debit" },
  ]
};

const creditCosts = {
  search: 1,
  companyDetail: 3,
  exportPerCompany: 2,
  linkedinEnrichment: 5,
  map: 1,
};

export async function GET(request: NextRequest) {
  try {
    // In a real app, you would validate the user session/token
    const userId = request.headers.get('x-user-id') || 'user_123';

    return NextResponse.json({
      success: true,
      data: {
        userId,
        balance: userCredits.balance,
        lastUpdated: userCredits.lastUpdated,
        lowBalanceWarning: userCredits.balance < 50,
        estimatedDaysRemaining: Math.floor(userCredits.balance / 10), // Assuming 10 credits/day average
      }
    });

  } catch (error) {
    console.error('[Credits API Error]:', error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des crédits" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, amount, description } = body;

    // Validate required fields
    if (!action || !amount) {
      return NextResponse.json(
        { error: "Action et montant requis" },
        { status: 400 }
      );
    }

    // Check if user has enough credits for debit actions
    if (action === 'debit' && userCredits.balance < amount) {
      return NextResponse.json(
        { 
          error: "Crédits insuffisants",
          currentBalance: userCredits.balance,
          required: amount,
          shortBy: amount - userCredits.balance
        },
        { status: 402 } // Payment Required
      );
    }

    // Update balance
    if (action === 'credit') {
      userCredits.balance += amount;
    } else if (action === 'debit') {
      userCredits.balance -= amount;
    } else {
      return NextResponse.json(
        { error: "Action invalide. Utilisez 'credit' ou 'debit'" },
        { status: 400 }
      );
    }

    // Add to history
    const newTransaction = {
      id: userCredits.history.length + 1,
      date: new Date().toISOString().split('T')[0],
      description: description || `${action === 'credit' ? 'Achat' : 'Utilisation'} de crédits`,
      amount: action === 'credit' ? amount : -amount,
      type: action
    };

    userCredits.history.unshift(newTransaction);
    userCredits.lastUpdated = new Date().toISOString();

    // In a real app, you would save to database here

    return NextResponse.json({
      success: true,
      data: {
        newBalance: userCredits.balance,
        transaction: newTransaction,
        lowBalanceWarning: userCredits.balance < 50,
        message: action === 'credit' 
          ? `${amount} crédits ajoutés avec succès`
          : `${amount} crédits débités avec succès`
      }
    });

  } catch (error) {
    console.error('[Credits Update Error]:', error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour des crédits" },
      { status: 500 }
    );
  }
}

// Endpoint to get credit costs
export async function PUT(request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: {
      costs: creditCosts,
      explanation: {
        search: "Recherche simple dans la base de données",
        companyDetail: "Fiche entreprise complète avec données légales",
        exportPerCompany: "Export CSV par entreprise",
        linkedinEnrichment: "Enrichissement des contacts LinkedIn",
        map: "Affichage carte Google Maps"
      },
      bestValue: "Pack Pro (500 crédits pour 29€ = 0.058€/crédit)"
    }
  });
}