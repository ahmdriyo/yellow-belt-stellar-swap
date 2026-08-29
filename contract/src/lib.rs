#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype,
    Address, Env, Symbol, Vec,
    token::{Client as TokenClient, StellarAssetClient},
};

#[contracttype]
#[derive(Clone)]
pub struct Order {
    pub id: u64,
    pub seller: Address,
    pub sell_token: Address,
    pub buy_token: Address,
    pub sell_amount: i128,
    pub buy_amount: i128,
    pub active: bool,
}

#[contracttype]
pub enum DataKey {
    Order(u64),
    OrderCount,
    Admin,
    TokenA,
    TokenB,
}

#[contract]
pub struct SwapContract;

#[contractimpl]
impl SwapContract {
    /// Sets the admin and the two demo token addresses used by `faucet`.
    pub fn initialize(env: Env, admin: Address, token_a: Address, token_b: Address) {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::TokenA, &token_a);
        env.storage().instance().set(&DataKey::TokenB, &token_b);
    }

    /// Mints demo test tokens (token_a + token_b) to the caller so they can
    /// place and fill orders without needing an external faucet.
    pub fn faucet(env: Env, user: Address) {
        user.require_auth();
        let token_a: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenA)
            .expect("token_a not set");
        let token_b: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenB)
            .expect("token_b not set");
        let amount: i128 = 1_000_000_000_000; // 100_000 tokens (7 decimals)
        StellarAssetClient::new(&env, &token_a).mint(&user, &amount);
        StellarAssetClient::new(&env, &token_b).mint(&user, &amount);
    }

    /// Creates a limit order: the seller deposits `sell_amount` of `sell_token`
    /// into the contract. Emits an `order_placed` event.
    pub fn place_order(
        env: Env,
        seller: Address,
        sell_token: Address,
        buy_token: Address,
        sell_amount: i128,
        buy_amount: i128,
    ) -> u64 {
        seller.require_auth();
        if sell_amount <= 0 || buy_amount <= 0 {
            panic!("amounts must be positive");
        }
        TokenClient::new(&env, &sell_token).transfer(
            &seller,
            &env.current_contract_address(),
            &sell_amount,
        );

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

    /// Fills an existing order: the filler pays `buy_amount` of `buy_token` to
    /// the seller and receives `sell_amount` of `sell_token` from the contract.
    /// Emits an `order_filled` event.
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
        TokenClient::new(&env, &order.buy_token).transfer(&filler, &order.seller, &order.buy_amount);
        TokenClient::new(&env, &order.sell_token).transfer(
            &env.current_contract_address(),
            &filler,
            &order.sell_amount,
        );

        let mut closed = order.clone();
        closed.active = false;
        env.storage().instance().set(&DataKey::Order(order_id), &closed);

        env.events()
            .publish((Symbol::new(&env, "order_filled"), order_id), order.clone());
    }

    /// Cancels an order and returns the deposited tokens to the seller.
    /// Emits an `order_cancelled` event.
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
        TokenClient::new(&env, &order.sell_token).transfer(
            &env.current_contract_address(),
            &seller,
            &order.sell_amount,
        );

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
