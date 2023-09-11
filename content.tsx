import type { PlasmoCSConfig, PlasmoGetInlineAnchorList } from "plasmo"
import { useEffect, useState } from "react"
import ReactDOM from "react-dom"
import axios from 'axios'

const randomDelay = async (): Promise<void> => {
  // between 0 - 2 seconds
  return new Promise(resolve => setTimeout(resolve, Math.random() * 1000 * 2))
}

const getCalories = async (href: string): Promise<number | void> => {  
  await randomDelay() // do not blast all requests at the same time

  // todo cache requests

  const html = await axios.get("https://www.s-kaupat.fi" + href).then(res => res.data)
  const doc = new DOMParser().parseFromString(html, "text/html");
  const tableCells = Array.from(doc.querySelectorAll("[data-test-id=nutrients-info-per-unit-content] .cell"))
  const energy = tableCells.find(el => el.innerHTML === 'Energiaa')?.nextElementSibling?.innerHTML

  if (energy) {    
      const calories = energy.split(" / ")[1].replace(" kcal", "")
    
      return Number(calories)
  }
}

const getItemStatistics = async (product: Element) => {
  const totalPrice = Number(product.querySelector("[data-test-id=product-price__dynamic-unitPrice]")
    .innerHTML
    .replace("~", "")
    .replace("€", "")
    .trim()
    .replace(",","."))

  const comparisonPrice = Number(product
    .querySelector("[data-test-id=cartItem__productPrice__comparisonPrice]")
    .innerHTML
    .replace("~", "")
    .replace("€/", "")
    .replace("kg","")
    .replace("l","")
    .trim()
    .replace(",","."))
    
  const quantity = totalPrice / comparisonPrice

  const href = product.querySelector("a[data-test-id=cartItem__productName]").getAttribute('href')

  const caloriesPerTenthOfComparisonSize = await getCalories(href)

  if (caloriesPerTenthOfComparisonSize) {
    const calories = caloriesPerTenthOfComparisonSize * 10 * quantity

    return {
      calories
    }
  } else {
    return {
      calories: 0
    }
  }
}

function debounce(func, timeout = 300){
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

const CustomButton = () => {
  const [totalCalories, setTotalCalories] = useState(0)
  const [loading, setLoading] = useState(true)

  const updateCartCalories = () => {
    setLoading(true)
    const products = Array.from(document.querySelectorAll("#sidepanel article"))
    Promise.all(products.map(getItemStatistics)).then(arr => {
      const totalCalories = arr.map(el => el.calories).reduce((a, b) => a + b);
      setTotalCalories(Math.round(totalCalories))
      setLoading(false)
    } )
  }

  useEffect(() => {
    // update calories
    updateCartCalories()

    // start observing changes in cart
    const targetNode = document.querySelector("[data-test-id=shoppingCart] ul");
    const config = { attributes: true, childList: true, subtree: true };
    const observer = new MutationObserver(debounce(() => updateCartCalories()));
    observer.observe(targetNode, config);      

    return () => observer.disconnect();
  }, [])

  useEffect(() => {


  }, [])
  
  if (loading) return <p>Loading...</p>

  return <p>{totalCalories} kcal</p>
}
   
export default CustomButton

export const getInlineAnchorList: PlasmoGetInlineAnchorList = async () => {    
  return document.querySelectorAll("[data-test-id=shoppingCart]")
}

export const config: PlasmoCSConfig = {
  matches: ["https://www.s-kaupat.fi/*"]
} 