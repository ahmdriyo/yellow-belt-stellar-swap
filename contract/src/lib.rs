#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype,
    Address, Env, Symbol, Vec,
};

#[contracttype]
#[derive(Clone)]
pub struct Order {
    pub id: u64,
    pub seller: Address,
    pub sell_token: Symbol,
    pub buy_token: Symbol,
    pub sell_amount: i128,
    pub buy_amount: i128,
    pub active: bool,
}

#[contracttype]
pub enum DataKey {
    Order(u64),
    OrderCount,
    Admin,
    // (token, user) -> balance
    Balance(Symbol, Address),
}

#[contract]
pub struct SwapContract;

fn balance(env: &Env, token: &Symbol, user: &Address) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::Balance(token.clone(), user.clone()))
        .unwrap_or(0)
}

fn set_balance(env: &Env, token: &Symbol, user: &Address, amount: i128) {
    env.storage()
        .persistent()
        .set(&DataKey::Balance(token.clone(), user.clone()), &amount);
}

#[contractimpl]
impl SwapContract {
    /// Sets the admin (used for authorization of future admin-gated calls).
    pub fn initialize(env: Env, admin: Address) {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    /// Mints demo test tokens (SWAP1 + SWAP2) to the caller so they can place
    /// and fill orders without needing a Stellar Asset Contract trustline.
    pub fn faucet(env: Env, user: Address) {
        user.require_auth();
        let amount: i128 = 1_000_000_000_000; // 100_000 tokens (7 decimals)
        for token in [
            Symbol::new(&env, "SWAP1"),
            Symbol::new(&env, "SWAP2"),
        ] {
            let cur = balance(&env, &token, &user);
            set_balance(&env, &token, &user, cur + amount);
        }
    }

    /// Read a user's balance for a given demo token.
    pub fn balance(env: Env, token: Symbol, user: Address) -> i128 {
        balance(&env, &token, &user)
    }

    /// Creates a limit order: the seller's `sell_token` is moved into the
    /// contract's escrow and an order is recorded. Emits `order_placed`.
    pub fn place_order(
        env: Env,
        seller: Address,
        sell_token: Symbol,
        buy_token: Symbol,
        sell_amount: i128,
        buy_amount: i128,
    ) -> u64 {
        seller.require_auth();
        if sell_amount <= 0 || buy_amount <= 0 {
            panic!("amounts must be positive");
        }
        let cur = balance(&env, &sell_token, &seller);
        if cur < sell_amount {
            panic!("insufficient balance");
        }
        // pull sell tokens from seller into contract escrow
        set_balance(&env, &sell_token, &seller, cur - sell_amount);
        let contract = env.current_contract_address();
        let esc = balance(&env, &sell_token, &contract);
        set_balance(&env, &sell_token, &contract, esc + sell_amount);

        let mut count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::OrderCount)
            .unwrap_or(0);
        count += 1;

        let order = Order {
            id: count,
            seller: seller.clone(),
            sell_token,
            buy_token,
            sell_amount,
            buy_amount,
            active: true,
        };
        env.storage().instance().set(&DataKey::Order(count), &order);
        env.storage().instance().set(&DataKey::OrderCount, &count);

        env.events()
            .publish((Symbol::new(&env, "order_placed"), count), order.clone());
        count
    }

    /// Fills an existing order: the filler pays `buy_token` to the seller and
    /// receives `sell_token` from the contract escrow. Emits `order_filled`.
    pub fn fill_order(env: Env, order_id: u64, filler: Address) {
        filler.require_auth();
        let order: Order = env
            .storage()
            .instance()
            .get(&DataKey::Order(order_id))
            .expect("order not found");
        if !order.active {
            panic!("order not active");
        }
        let contract = env.current_contract_address();

        // filler pays buy_token to seller
        let fb = balance(&env, &order.buy_token, &filler);
        if fb < order.buy_amount {
            panic!("insufficient balance to fill");
        }
        set_balance(&env, &order.buy_token, &filler, fb - order.buy_amount);
        let sb = balance(&env, &order.buy_token, &order.seller);
        set_balance(&env, &order.buy_token, &order.seller, sb + order.buy_amount);

        // contract sends sell_token to filler
        let ce = balance(&env, &order.sell_token, &contract);
        set_balance(&env, &order.sell_token, &contract, ce - order.sell_amount);
        let fe = balance(&env, &order.sell_token, &filler);
        set_balance(&env, &order.sell_token, &filler, fe + order.sell_amount);

        let mut closed = order.clone();
        closed.active = false;
        env.storage().instance().set(&DataKey::Order(order_id), &closed);

        env.events()
            .publish((Symbol::new(&env, "order_filled"), order_id), order.clone());
    }

    /// Cancels an order and returns the escrowed tokens to the seller.
    /// Emits `order_cancelled`.
    pub fn cancel_order(env: Env, order_id: u64, seller: Address) {
        seller.require_auth();
        let order: Order = env
            .storage()
            .instance()
            .get(&DataKey::Order(order_id))
            .expect("order not found");
        if !order.active {
            panic!("order not active");
        }
        if order.seller != seller {
            panic!("not the seller");
        }
        let contract = env.current_contract_address();
        let ce = balance(&env, &order.sell_token, &contract);
        set_balance(&env, &order.sell_token, &contract, ce - order.sell_amount);
        let se = balance(&env, &order.sell_token, &seller);
        set_balance(&env, &order.sell_token, &seller, se + order.sell_amount);

        let mut closed = order.clone();
        closed.active = false;
        env.storage().instance().set(&DataKey::Order(order_id), &closed);

        env.events().publish(
            (Symbol::new(&env, "order_cancelled"), order_id),
            order.clone(),
        );
    }

    pub fn get_order(env: Env, order_id: u64) -> Order {
        env.storage()
            .instance()
            .get(&DataKey::Order(order_id))
            .expect("order not found")
    }

    /// Returns all active orders (the orderbook) for the UI to render.
    pub fn get_orders(env: Env) -> Vec<Order> {
        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::OrderCount)
            .unwrap_or(0);
        let mut orders: Vec<Order> = Vec::new(&env);
        for i in 1..=count {
            if let Some(order) = env.storage().instance().get::<_, Order>(&DataKey::Order(i)) {
                if order.active {
                    orders.push_back(order);
                }
            }
        }
        orders
    }
}
