import {select, templates, settings, classNames} from '../settings.js';
import utils from '../utils.js';
import AmountWidget from './AmountWidget.js';
import DatePicker from './DatePicker.js';
import HourPicker from './HourPicker.js';

class Booking {
  constructor(element){
    const thisBooking = this;
    thisBooking.render(element);
    thisBooking.initWidgets();
    thisBooking.getData();
    thisBooking.initTables();
  }

  getData(){
    const thisBooking = this;

    const startDateParam = settings.db.dateStartParamKey + '=' + utils.dateToStr(thisBooking.datePickerElem.minDate);
    const endDateParam = settings.db.dateEndParamKey + '=' + utils.dateToStr(thisBooking.datePickerElem.maxDate);

    const params = {
      booking: [
        startDateParam,
        endDateParam,
      ],
      eventsCurrent: [
        settings.db.notRepeatParam,
        startDateParam,
        endDateParam,
      ],
      eventsRepeat: [
        settings.db.repeatParam,
        endDateParam,
      ],
    };
    const urls = {
      booking: settings.db.url + '/' + settings.db.booking + '?' + params.booking.join('&'),
      eventsCurrent: settings.db.url + '/' + settings.db.event + '?' + params.eventsCurrent.join('&'),
      eventsRepeat: settings.db.url + '/' + settings.db.event + '?' + params.eventsRepeat.join('&'),
    };
    Promise.all([
      fetch(urls.booking),
      fetch(urls.eventsCurrent),
      fetch(urls.eventsRepeat),
    ])
      .then(function(allResponses){
        const bookingsResponse = allResponses[0];
        const eventsCurrentResponse = allResponses[1];
        const eventsRepeatResponse = allResponses[2];
        return Promise.all([
          bookingsResponse.json(),
          eventsCurrentResponse.json(),
          eventsRepeatResponse.json(),
        ]);
      })
      .then(function([bookings, eventsCurrent, eventsRepeat]){
        thisBooking.parseData(bookings, eventsCurrent, eventsRepeat);
      });
  }


  render(element){
    const thisBooking = this;

    /* generate HTML based on template */
    const generatedHTML = templates.bookingWidget();
    /* create element using utils.createElementFromHTML */
    thisBooking.element = utils.createDOMFromHTML(generatedHTML);
    /* find menu container */
    const bookingContainer = document.querySelector(select.containerOf.booking);
    /* add element to menu */
    bookingContainer.appendChild(thisBooking.element);

    thisBooking.dom = {
      wrapper: element,
      hoursAmount: element.querySelector(select.booking.hoursAmount),
      peopleAmount: element.querySelector(select.booking.peopleAmount),
      datePicker: element.querySelector(select.widgets.datePicker.wrapper),
      hourPicker: element.querySelector(select.widgets.hourPicker.wrapper),
      tables: element.querySelectorAll(select.booking.tables),
      diningRoom: element.querySelector(select.booking.diningRoom),
      phone: element.querySelector(select.booking.phone),
      address: element.querySelector(select.booking.address),
      form: element.querySelector(select.booking.form),
      bookingOptions: element.querySelector(select.booking.bookingOptions)
    };
    thisBooking.starters = [];
  }

  parseData(bookings, eventsCurrent, eventsRepeat){
    const thisBooking = this;

    thisBooking.booked = {};
    for(let item of bookings){
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    for(let item of eventsCurrent){
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    const minDate = thisBooking.datePickerElem.minDate;
    const maxDate = thisBooking.datePickerElem.maxDate;

    for(let item of eventsRepeat){
      if(item.repeat == 'daily'){
        for(let loopDate = minDate; loopDate <= maxDate; loopDate = utils.addDays(loopDate, 1)){
          thisBooking.makeBooked(utils.dateToStr(loopDate), item.hour, item.duration, item.table);
        }
      }
    }
    thisBooking.updateDOM();
  }

  makeBooked(date, hour, duration, table){
    const thisBooking = this;

    if(typeof thisBooking.booked[date] == 'undefined'){
      thisBooking.booked[date] = {};
    }
    const startHour = utils.hourToNumber(hour);

    for(let hourBlock = startHour; hourBlock < startHour + duration; hourBlock += 0.5){
      if(typeof thisBooking.booked[date][hourBlock] == 'undefined'){
        thisBooking.booked[date][hourBlock] = [];
      }

      thisBooking.booked[date][hourBlock].push(table);
    }
  }

  initWidgets(){
    const thisBooking = this;

    thisBooking.peopleAmountElem = new AmountWidget(thisBooking.dom.peopleAmount);
    thisBooking.hoursAmountElem = new AmountWidget(thisBooking.dom.hoursAmount);
    thisBooking.datePickerElem = new DatePicker(thisBooking.dom.datePicker);
    thisBooking.hourPickerElem = new HourPicker(thisBooking.dom.hourPicker);

    thisBooking.dom.wrapper.addEventListener('updated', function(){
      thisBooking.updateDOM();
    });

    thisBooking.dom.form.addEventListener('submit', function(event){
      event.preventDefault();
      thisBooking.sendBooking();
    });

    thisBooking.dom.bookingOptions.addEventListener('click', function(event){
      const starter = event.target;

      if(starter.getAttribute('type') === 'checkbox' && starter.getAttribute('name') === 'starter'){
        if(starter.checked){
          thisBooking.starters.push(starter.value);
        } else if (!starter.checked){
          const starterId = thisBooking.starters.indexOf(starter.value);
          thisBooking.starters.splice(starterId, 1);
        }
      }
    });
  }

  initTables(){
    const thisBooking = this;

    thisBooking.dom.diningRoom.addEventListener('click', function(event){

      const clickedElement = event.target;
      const table = clickedElement.getAttribute(settings.booking.tableIdAttribute);
      let tableId = '';
      if(table){
        if(!clickedElement.classList.contains(classNames.booking.tableBooked)){
          const tables = thisBooking.element.querySelectorAll(select.booking.tables);
          if(!clickedElement.classList.contains(classNames.booking.tableSelected)){
            for(let table of tables ){
              table.classList.remove(classNames.booking.tableSelected);
              tableId = '';
            }
            clickedElement.classList.add(classNames.booking.tableSelected);

            const clickedElementId = clickedElement.getAttribute('data-table');
            tableId = clickedElementId;
            thisBooking.tableId = parseInt(tableId);

          } else if (clickedElement.classList.contains(classNames.booking.tableSelected)){
            clickedElement.classList.remove(classNames.booking.tableSelected);
          }
        }
      }
    });
  }

  sendBooking(){
    const thisBooking = this;

    const url = settings.db.url + '/' + settings.db.booking;

    const payload = {
      date: thisBooking.datePickerElem.value,
      hour: thisBooking.hourPickerElem.value,
      table: thisBooking.tableId,
      duration: parseInt(thisBooking.hoursAmountElem.value),
      ppl: parseInt(thisBooking.peopleAmountElem.value),
      starters: thisBooking.starters,
      phone: thisBooking.dom.phone.value,
      address: thisBooking.dom.address.value
    };

    thisBooking.makeBooked(payload.date, payload.hour, payload.duration, payload.table);

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    };
    fetch(url, options);
    thisBooking.updateDOM();
  }

  updateDOM(){
    const thisBooking = this;

    thisBooking.date = thisBooking.datePickerElem.value;
    thisBooking.hour = utils.hourToNumber(thisBooking.hourPickerElem.value);
    let allAvailable = false;

    if (typeof thisBooking.booked[thisBooking.date] == 'undefined' || typeof thisBooking.booked[thisBooking.date][thisBooking.hour] == 'undefined'){
      allAvailable = true;
    }

    for(let table of thisBooking.dom.tables){
      let tableId = table.getAttribute(settings.booking.tableIdAttribute);
      if(!isNaN(tableId)){
        tableId = parseInt(tableId);
      }

      if(!allAvailable && thisBooking.booked[thisBooking.date][thisBooking.hour].includes(tableId) >= 1){
        table.classList.add(classNames.booking.tableBooked);
      } else {
        table.classList.remove(classNames.booking.tableBooked);
      }
    }
  }
}

export default Booking;
