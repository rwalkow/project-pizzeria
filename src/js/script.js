/* global Handlebars, utils, dataSource */ // eslint-disable-line no-unused-vars

{
  'use strict';

  const select = {
    templateOf: {
      menuProduct: '#template-menu-product',
      cartProduct: '#template-cart-product', // CODE ADDED
    },
    containerOf: {
      menu: '#product-list',
      cart: '#cart',
    },
    all: {
      menuProducts: '#product-list > .product',
      menuProductsActive: '#product-list > .product.active',
      formInputs: 'input, select',
    },
    menuProduct: {
      clickable: '.product__header',
      form: '.product__order',
      priceElem: '.product__total-price .price',
      imageWrapper: '.product__images',
      amountWidget: '.widget-amount',
      cartButton: '[href="#add-to-cart"]',
    },
    widgets: {
      amount: {
        input: 'input.amount', // CODE CHANGED
        //input: 'input[name="amount"]',
        linkDecrease: 'a[href="#less"]',
        linkIncrease: 'a[href="#more"]',
      },
    },
    // CODE ADDED START
    cart: {
      productList: '.cart__order-summary',
      toggleTrigger: '.cart__summary',
      totalNumber: `.cart__total-number`,
      totalPrice: '.cart__total-price strong, .cart__order-total .cart__order-price-sum strong',
      subtotalPrice: '.cart__order-subtotal .cart__order-price-sum strong',
      deliveryFee: '.cart__order-delivery .cart__order-price-sum strong',
      form: '.cart__order',
      formSubmit: '.cart__order [type="submit"]',
      phone: '[name="phone"]',
      address: '[name="address"]',
    },
    cartProduct: {
      amountWidget: '.widget-amount',
      price: '.cart__product-price',
      edit: '[href="#edit"]',
      remove: '[href="#remove"]',
    },
  // CODE ADDED END
  };

  const classNames = {
    menuProduct: {
      wrapperActive: 'active',
      imageVisible: 'active',
    },
    // CODE ADDED START
    cart: {
      wrapperActive: 'active',

    },
    // CODE ADDED END
  };

  const settings = {
    amountWidget: {
      defaultValue: 1,
      defaultMin: 0,
      defaultMax: 10,
    }, // CODE CHANGED
    // CODE ADDED START
    cart: {
      defaultDeliveryFee: 20,
    },
    // CODE ADDED END
    db: {
      //url: '//localhost:3131',
      // for gitpod 
      url: 'https://3131-rwalkow-projectpizzeria-sbojeadkx5b.ws-eu38.gitpod.io', 
      // change -i7inutsa40n.ws-eu38 to current gitpod generated id and restart npm run watch
      products: 'products',
      orders: 'orders',
    },
  };

  const templates = {
    menuProduct: Handlebars.compile(document.querySelector(select.templateOf.menuProduct).innerHTML),
    // CODE ADDED START
    cartProduct: Handlebars.compile(document.querySelector(select.templateOf.cartProduct).innerHTML),
  // CODE ADDED END
  };

  class Product {
    constructor(id, data) {
      const thisProduct = this;
      
      //console.log('new Product:', thisProduct);
      thisProduct.id = id;
      thisProduct.data = data;
      thisProduct.renderInMenu();
      thisProduct.initAccordion();
      thisProduct.getElements();
      thisProduct.initOrderForm();
      thisProduct.initAmountWidget();
      thisProduct.processOrder();
    }

    initAmountWidget(){
      const thisProduct = this;
      // [NEW] create new instance in class AmountWidget 
      thisProduct.amountWidget = new AmountWidget(thisProduct.amountWidgetElem);
      thisProduct.amountWidgetElem.addEventListener('updated', function(){
        thisProduct.processOrder(); 
      });
    }
    
    renderInMenu() {
      const thisProduct = this;
      /* generate HTML based on template */
      const generatedHTML = templates.menuProduct(thisProduct.data);
      /* create element using utils.createElementFromHTML */
      thisProduct.element = utils.createDOMFromHTML(generatedHTML);
      /* find menu container */
      const menuContainer = document.querySelector(select.containerOf.menu);
      /* add element to menu */
      menuContainer.appendChild(thisProduct.element);
    }

    getElements(){
      const thisProduct = this;
      thisProduct.accordionTrigger = thisProduct.element.querySelector(select.menuProduct.clickable);
      thisProduct.form = thisProduct.element.querySelector(select.menuProduct.form);
      thisProduct.formInputs = thisProduct.form.querySelectorAll(select.all.formInputs);
      thisProduct.cartButton = thisProduct.element.querySelector(select.menuProduct.cartButton);
      thisProduct.priceElem = thisProduct.element.querySelector(select.menuProduct.priceElem);
      thisProduct.imageWrapper = thisProduct.element.querySelector(select.menuProduct.imageWrapper);
      thisProduct.amountWidgetElem = thisProduct.element.querySelector(select.menuProduct.amountWidget);
    }

    initAccordion() {
      const thisProduct = this;
      /* find the clickable trigger (the element that should react to clicking) */
      const clickableTrigger = thisProduct.element.querySelector(
        select.menuProduct.clickable
      );
      //console.log('clickable', clickableTrigger);
      /* START: add event listener to clickable trigger on event click */
      clickableTrigger.addEventListener('click', function(event) {
        /* prevent default action for event */
        event.preventDefault();
        /* find active product (product that has active class) */
        const activeProduct = document.querySelector(select.all.menuProductsActive);
          
        /* if there is active product and it's not thisProduct.element, remove class active from it */
        if (activeProduct != null && activeProduct != thisProduct.element) {
          activeProduct.classList.remove('active');        
        }
        /* toggle active class on thisProduct.element */
        thisProduct.element.classList.toggle('active');
      });
    }

    initOrderForm(){
      const thisProduct = this;
      thisProduct.form.addEventListener('submit', function(event){
        event.preventDefault();
        thisProduct.processOrder();
      });

      for(let input of thisProduct.formInputs){
        input.addEventListener('change', function(){
          thisProduct.processOrder();
        });
      }
      thisProduct.cartButton.addEventListener('click', function(event){
        event.preventDefault();
        thisProduct.processOrder();
        thisProduct.addToCart();
      });
    }

    processOrder(){
      const thisProduct = this;
      //console.log('processOrder:', thisProduct);

      // convert form to objet structure e.g. { sauce: ['tomato'], toppings: ['olives', redPeppers]}
      const formData = utils.serializeFormToObject(thisProduct.form);
      //console.log('formData', formData);
      
      // set price to default price 
      let price = thisProduct.data.price;
      
      // for every category (param)...
      for(let paramId in thisProduct.data.params) {
        // determine param value, e.g. paramId = 'toppings', param = { lablel: 'Toppings', type: 'checkoboxes'...}
        const param = thisProduct.data.params[paramId];
        //console.log('param:', paramId, param);
      
        // for every option in this category
        for(let optionId in param.options) {
          // determine option value, e.g. optionId = 'olives', option = { label: 'Olives', price: 2, default: true }
          const option = param.options[optionId];
          //console.log('option:', option.price);
          // check if option is selected
          const optionSelected = formData[paramId] && formData[paramId].includes(optionId);        
          // check if there is param with name of paramId in formData and if it includes optionId
          if(optionSelected) {
            // check if the option is not default
            if (!option.default) {
              //console.log('default', option.default);
              // add option price to variable
              price += option.price;
            }
          } else {
            // check if the option is default
            if (option.default) {
              // reduce price variable
              price -= option.price;
            }
          }

          const optionImage = thisProduct.imageWrapper.querySelector('.' + paramId + '-' + optionId);

          if (optionImage && optionSelected){
            optionImage.classList.add(classNames.menuProduct.imageVisible);          
          } else {

            if (optionImage && !optionSelected){
              optionImage.classList.remove(classNames.menuProduct.imageVisible);
            }
          }
        }
      }
      //multiply pric by amount
      price *= thisProduct.amountWidget.value;
 
      //get product price
      thisProduct.priceSingle = price / thisProduct.amountWidget.value;

      // update calculated price in the HTML
      thisProduct.priceElem.innerHTML = price;     
    }
      
    addToCart(){
      const thisProduct = this;

      app.cart.add(thisProduct.prepareCartProduct());
    }

    prepareCartProduct(){
      const thisProduct = this;

      const productSummary = {
        id: thisProduct.id,
        name: thisProduct.data.name,
        amount: thisProduct.amountWidget.value,
        priceSingle: thisProduct.priceSingle,
        price: thisProduct.priceSingle * thisProduct.amountWidget.value,
        params: thisProduct.prepareCartProductParams(),      
      };
      return productSummary;      
    }

    prepareCartProductParams(){
      const thisProduct = this;
      
      // convert form to objet structure e.g. { sauce: ['tomato'], toppings: ['olives', redPeppers]}
      const formData = utils.serializeFormToObject(thisProduct.form);  
      
      const params = {};     

      // for every category (param)...
      for(let paramId in thisProduct.data.params) {
        // determine param value, e.g. paramId = 'toppings', param = { label: 'Toppings', type: 'checkoboxes'...}
        const param = thisProduct.data.params[paramId];
        
        // create category param in params const
        params[paramId] = {
          label: param.label,
          options: {}
        };

        // for every option in this category
        for(let optionId in param.options) {
          
          // determine option value, e.g. optionId = 'olives', option = { label: 'Olives', price: 2, default: true }
          const option = param.options[optionId];  
          
          // check if option is selected
          const optionSelected = formData[paramId] && formData[paramId].includes(optionId);
          // check if there is param with name of paramId in formData and if it includes optionId
          if(optionSelected) {
            params[paramId].options[optionId] = option.label;      
          }         
        }          
      }
      return params;     
    }
  }

  class AmountWidget{
    constructor(element){
      const thisWidget = this;

      thisWidget.getElements(element);
      thisWidget.setValue(thisWidget.input.value || settings.amountWidget.defaultValue);
      thisWidget.initActions();
      //console.log('AmountWidget:', thisWidget);
      //console.log('constructor arguments:', element);
    }
    // [NEW] find elements of Widget
    getElements(element){
      const thisWidget = this;

      thisWidget.element = element;
      thisWidget.input = thisWidget.element.querySelector(select.widgets.amount.input);
      thisWidget.linkDecrease = thisWidget.element.querySelector(select.widgets.amount.linkDecrease);
      thisWidget.linkIncrease = thisWidget.element.querySelector(select.widgets.amount.linkIncrease);
    }

    setValue(value){
      const thisWidget = this;

      const newValue = parseInt(value);

      /* Add validation */
      if(thisWidget.value !== newValue && !isNaN(newValue)){
        thisWidget.value = newValue;
      }
      if(thisWidget.value >= settings.amountWidget.defaultMax){
        thisWidget.value = settings.amountWidget.defaultMax;
      }
      if(thisWidget.value <= settings.amountWidget.defaultMin){
        thisWidget.value = settings.amountWidget.defaultMin;
      }
  
      thisWidget.input.value = thisWidget.value;
      thisWidget.announce();
    }

    initActions(){
      const thisWidget = this;

      thisWidget.input.addEventListener('change', function(){
        thisWidget.setValue(thisWidget.input.value);
      });
      thisWidget.linkDecrease.addEventListener('click',  function(event){
        event.preventDefault();
        thisWidget.setValue(thisWidget.value - 1);       
      });
      thisWidget.linkIncrease.addEventListener('click',  function(event){
        event.preventDefault();
        thisWidget.setValue(thisWidget.value + 1);       
      });
    }
  
    announce(){
      const thisWidget = this;
      const event = new CustomEvent('updated', {
        bubbles: true
      });

      thisWidget.element.dispatchEvent(event);
    }
  }
  
  class Cart{
    constructor(element){
      const thisCart = this;

      thisCart.products = [];
      thisCart.getElements(element);
      console.log('new Cart:', thisCart);
      thisCart.initActions();
    }

    getElements(element){
      const thisCart = this;

      thisCart.dom = {
        wrapper: element,   
        toggleTrigger: element.querySelector(select.cart.toggleTrigger),
        productList: element.querySelector(select.cart.productList),
        deliveryFee: element.querySelector(select.cart.deliveryFee),
        subtotalPrice: element.querySelector(select.cart.subtotalPrice),
        totalPrice: element.querySelectorAll(select.cart.totalPrice),
        totalNumber: element.querySelector(select.cart.totalNumber), 
        form: element.querySelector(select.cart.form),  
        phone: element.querySelector(select.cart.phone),
        address: element.querySelector(select.cart.address),       
      };      
    }

    initActions(){
      const thisCart = this;

      thisCart.dom.toggleTrigger.addEventListener('click', function(event){
        event.preventDefault();
        thisCart.dom.wrapper.classList.toggle(classNames.cart.wrapperActive);
      });
      thisCart.dom.productList.addEventListener('updated', function(){
        thisCart.update();
      });
      thisCart.dom.productList.addEventListener('remove', function(event){
        thisCart.remove(event.detail.cartProduct);
      });
      thisCart.dom.form.addEventListener('submit', function(event){
        event.preventDefault();
        thisCart.sendOrder();
      });
    }

    sendOrder(){
      const thisCart = this;

      const url = settings.db.url + '/' + settings.db.orders;

      const payload = {
        adress: thisCart.dom.address.value,
        phone: thisCart.dom.phone.value,
        totalPrice: thisCart.totalPrice,
        subtotalPrice: thisCart.subtotalPrice,
        totalNumber: thisCart.totalNumber,
        deliveryFee: settings.cart.defaultDeliveryFee,
        products: [],      
      };

      const options = { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }, 
        body: JSON.stringify(payload) 
      };
      fetch(url, options);
      for(let prod of thisCart.products){
        payload.products.push(prod.getData());
      }
    }

    update(){
      const thisCart = this;

      let deliveryFee = settings.cart.defaultDeliveryFee;
      thisCart.totalNumber = 0;
      thisCart.subtotalPrice = 0;


      for(let product of thisCart.products){
        thisCart.totalNumber += product.amount;
        thisCart.subtotalPrice += product.price;
      }

      if(thisCart.totalNumber < 1){
        deliveryFee = 0;        
      }   

      thisCart.totalPrice = thisCart.subtotalPrice + deliveryFee;    
      thisCart.dom.totalNumber.innerHTML = thisCart.totalNumber;

      thisCart.dom.deliveryFee.innerHTML = deliveryFee;
      thisCart.dom.subtotalPrice.innerHTML = thisCart.subtotalPrice;
      //console.log('totalPrice:', thisCart.totalPrice);
      thisCart.dom.totalPrice.forEach((domElement) => {
        domElement.innerHTML = thisCart.totalPrice;
      });
    }
    
    add(menuProduct){
      const thisCart = this;

      /* generate HTML based on template */
      const generatedHTML = templates.cartProduct(menuProduct);
      /* create element using utils.createElementFromHTML */
      const generatedDOM = utils.createDOMFromHTML(generatedHTML);
      thisCart.dom.productList.appendChild(generatedDOM);

      thisCart.products.push(new CartProduct(menuProduct, generatedDOM));    
      thisCart.update();
    }
  
    remove(instance){
      const thisCart = this;      

      const list = thisCart.products;
      const productIndex = list.indexOf(instance);
      list.splice(productIndex, 1);         
      thisCart.update();         
    }
  }

  class CartProduct{
    constructor(menuProduct, element){
      const thisCartProduct = this;

      thisCartProduct.id = menuProduct.id;
      thisCartProduct.name = menuProduct.name;
      thisCartProduct.amount = menuProduct.amount;
      thisCartProduct.params = menuProduct.params;
      thisCartProduct.price = menuProduct.price;
      thisCartProduct.priceSingle = menuProduct.priceSingle;

      thisCartProduct.getElements(element);
      thisCartProduct.initAmountWidget();
      thisCartProduct.initActions();            
    }

    getElements(element){
      const thisCartProduct = this;

      thisCartProduct.dom = {
        wrapper: element,
        amountWidgetElem: element.querySelector(select.cartProduct.amountWidget),
        price: element.querySelector(select.cartProduct.price),
        edit: element.querySelector(select.cartProduct.edit), 
        remove: element.querySelector(select.cartProduct.remove),   
      };     
    }

    getData(){
      const thisCartProduct = this;

      const productSummary = {
        id: thisCartProduct.id,
        amount: thisCartProduct.amount,
        price: thisCartProduct.price,
        priceSingle: thisCartProduct.priceSingle,
        name: thisCartProduct.name,
        params: thisCartProduct.params,
      };
      return productSummary;
    }

    initAmountWidget(){
      const thisCartProduct = this;

      thisCartProduct.amountWidget = new AmountWidget(thisCartProduct.dom.amountWidgetElem);

      thisCartProduct.dom.amountWidgetElem.addEventListener('updated', function(){
        thisCartProduct.amount = thisCartProduct.amountWidget.value;
        thisCartProduct.price = thisCartProduct.priceSingle * thisCartProduct.amount;
        thisCartProduct.dom.price.innerHTML = thisCartProduct.price;      
      });
    }

    initActions(){
      const thisCartProduct = this;

      thisCartProduct.dom.remove.addEventListener('click', function(event){
        event.preventDefault();
        thisCartProduct.remove();
      });
    }

    remove(){
      const thisCartProduct = this;

      const event = new CustomEvent('remove', {
        bubbles: true,
        detail: {
          cartProduct: thisCartProduct,
        },
      });
      thisCartProduct.dom.wrapper.dispatchEvent(event);
      thisCartProduct.dom.wrapper.remove();
    }
  }

  const app = {
    initMenu: function () {
      const thisApp = this;
      //console.log('thisApp.data:', thisApp.data);

      for (let productData in thisApp.data.products) {
        new Product(thisApp.data.products[productData].id, thisApp.data.products[productData]);
      }
    },
    initData: function () {
      const thisApp = this;

      //thisApp.data = dataSource;
      thisApp.data = {};
      const url = settings.db.url + '/' + settings.db.products;
      fetch(url)
        .then(function(rawResponse){
          return rawResponse.json();
        })
        .then(function(parsedResponse){
          console.log('parsedResponse', parsedResponse);
          /* save parsedResponse as thisApp.data.products*/
          thisApp.data.products = parsedResponse;
          /* execute initMenu method */
          thisApp.initMenu();
        });
      console.log('thisApp.data', JSON.stringify(thisApp.data));


    },
    initCart: function(){
      const thisApp = this;

      const cartElem = document.querySelector(select.containerOf.cart);
      thisApp.cart = new Cart(cartElem);
    },
    init: function(){
      const thisApp = this;
      console.log('*** App starting ***');
      console.log('thisApp:', thisApp);
      console.log('classNames:', classNames);
      console.log('settings:', settings);
      console.log('templates:', templates);

      thisApp.initData();
      thisApp.initMenu();
      thisApp.initCart();
    },
  };

  app.init();
}
