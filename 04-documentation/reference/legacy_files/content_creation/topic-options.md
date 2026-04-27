## Variable examples

        {
            "initialValue": "let options = [];\n\nif (v.item_counts.audience > 0) {\n  options.push({ option: \"My audience\", value: \"an audience segment\" });\n}\n\nif (v.item_counts.offers > 0) {\n  options.push({ option: \"An offer\", value: \"a product/service we offer\" });\n}\n\nif (v.item_counts.methods > 0) {\n  options.push({\n    option: \"Knowledge asset\",\n    value: \"a methodology, framework, process, tool or technique we use in our business\",\n  });\n}\n\nif (v.item_counts?.magnet > 0) {\n  options.push({ option: \"A lead magnet\", value: \"one of our lead magnets\" });\n}\n\nif (v.item_counts.pillars > 0) {\n  options.push({\n    option: \"A content pillar\",\n    value: \"a key topic we talk about\",\n  });\n}\n\nif (v.item_counts.valueproposition > 0) {\n  options.push({ option: \"Value proposition\", value: \"the company's value proposition\" });\n}\n\nif (v.item_counts.platforms > 0 && r.Get_Selected_Content_Option.data.Content_types !== \"Content platform\") {\n  options.push({\n    option: \"A content platform\",\n    value: \"one of the platforms we use for content\",\n  });\n}\n\nif (v.item_counts.values > 0 || v.item_counts.mission === true || v.item_counts.purpose === true || v.item_counts.vision === true) {\n  options.push({ option: \"Brand meaning\", value: \"our values, mission, vision or purpose\" });\n}\n\nif (v.item_counts.proof > 0) {\n  options.push({\n    option: \"Brand proof\",\n    value: \"brand proof - i.e. trust-building signals\",\n  });\n}\n\nif (v.item_counts.sources_open > 0) {\n  options.push({ option: \"Source material\", value: \"brand knowledge or data extracted from a document\" });\n}\n\noptions.push({\n  option: \"Let me type in a thought or idea\",\n  value: \"free-text\",\n});\n\n\n\n// Create a lookup object\nconst optionsLookup = options.reduce((acc, opt) => {\n  acc[opt.value] = opt.option;\n  return acc;\n}, {});\n\n// Store the lookup object in a Wized variable\nv.topic1optionsLookup = optionsLookup;\n\n// Return the options as before\nreturn options;",
            "id": "45cc8a00-56db-4c0c-859f-e0e303ebd7e7",
            "name": "topic1options",
            "computed": true
        },


               {
            "computed": true,
            "name": "topic2options",
            "id": "905f2b4c-b708-478a-b2ef-bf47f1ecd662",
            "initialValue": "function getOptions(topic1chosen) {\n    const isInChatContext = v.pageModals.moogul_chat === true || n.path === \"/library/chat\";\n\n  const prePopulatedOptions = {\n    \"an audience segment\": [\n      {\n        option: \"Pain points\",\n        value: \"the problems, worries or fears this audience has\",\n      },\n      { option: \"Desires\", value: \"the things this audience needs or wants\" },\n      { option: \"Objections\", value: \"objections this audience might have\" },\n      { option: \"Beliefs\", value: \"key beliefs this audience has\" },\n    ],\n    \"our values, mission, vision or purpose\": [\n      {\n        option: \"Purpose\",\n        value: \"the purpose that drives us forward in our work\",\n      },\n      {\n        option: \"Vision\",\n        value:\n          \"the vision we have of how the world will be better when we succeed in our work\",\n      },\n      {\n        option: \"Mission\",\n        value: \"the work we do, day in, day out, to achieve our goals\",\n      },\n      {\n        option: \"Values\",\n        value: \"the things we do, believe in and care about\",\n      },\n    ],\n    \"brand proof - i.e. trust-building signals\": [\n      { option: \"A testimonial\", value: \"a testimonial from a client\" },\n      {\n        option: \"A stat\",\n        value: \"an interesting or enlightening statistic related to our work\",\n      },\n      { option: \"A case study\", value: \"a case study of a client\" },\n    ],\n    \"the company's value proposition\": [\n      {\n        option: \"Our target audience\",\n        value: \"the overarching audience we target with our content\",\n      },\n      {\n        option: \"Our service\",\n        value:\n          \"the distilled & overarching 'service' we offer clients on a broad basis, and how that brings them benefits\",\n      },\n      {\n        option: \"Primary differentiator\",\n        value: \"the key way in which we stand out from the market\",\n      },\n      {\n        option: \"Differentiators\",\n        value:\n          \"the secondary differentiators that help us stand out in the market and bolster our primary differentiator\",\n      },\n    ],\n  };\n\n  switch (topic1chosen) {\n    case \"an audience segment\":\n      // If we're in the chat context, return dynamic audience options\n      if (isInChatContext) {\n        return v.dna_summaries.audiences.map(audience => ({\n          option: audience.segment_name, // Assuming each audience has a 'name' property\n          value: audience.id\n        }));\n      } else {\n        // If not in chat context, return the original static options\n        return prePopulatedOptions[topic1chosen];\n      }\n    case \"the company's value proposition\":\n      return prePopulatedOptions[topic1chosen];\n\n    case \"our values, mission, vision or purpose\":\n      return prePopulatedOptions[topic1chosen].filter((option) => {\n        if (option.option === \"Purpose\" && !v.item_counts.purpose) return false;\n        if (option.option === \"Vision\" && !v.item_counts.vision) return false;\n        if (option.option === \"Mission\" && !v.item_counts.mission) return false;\n        if (option.option === \"Values\" && v.item_counts.values <= 0)\n          return false;\n        return true;\n      });\n\n    case \"brand proof - i.e. trust-building signals\":\n      console.log(\"prePopulatedOptions:\", prePopulatedOptions[topic1chosen]);\n      console.log(\"r.Get_Evidence.data:\", r.Get_Evidence.data);\n\n      return prePopulatedOptions[topic1chosen].filter((option) => {\n        const type = option.option.split(\" \")[1].toLowerCase();\n        console.log(\"Checking type:\", type);\n\n        const match = r.Get_Evidence.data.some(\n          (item) => item.type.toLowerCase() === type,\n        );\n        console.log(\"Match found:\", match);\n\n        return match;\n      });\n\n    case \"brand knowledge or data extracted from a document\":\n      const sources = r.Get_Sources.data;\n      const hasData = sources.some((source) =>\n        source.category.includes(\"Data\"),\n      );\n      const hasStory = sources.some((source) =>\n        source.category.includes(\"Story\"),\n      );\n\n      const categoryOptions = [];\n      if (hasData) {\n        categoryOptions.push({\n          option: \"Data\",\n          value: \"data\",\n        });\n      }\n      if (hasStory) {\n        categoryOptions.push({\n          option: \"Story\",\n          value: \"story\",\n        });\n      }\n\n      return categoryOptions;\n\n    case \"a key topic we talk about\":\n      return v.dna_summaries.pillars.map((pillar) => ({\n        option: pillar.topic,\n        value: pillar.id,\n      }));\n      break;\n\n    case \"a product/service we offer\":\n      return v.dna_summaries.offers.map((offer) => ({\n        option: offer.Offer_Name,\n        value: offer.id,\n      }));\n\n    case \"a methodology, framework, process, tool or technique we use in our business\":\n      return v.dna_summaries.methods.map((method) => ({\n        option: method.name,\n        value: method.id,\n      }));\n\n    case \"one of the platforms we use for content\":\n      return v.dna_summaries.platforms.map((platform) => ({\n        option: platform.platform_name,\n        value: platform.id,\n      }));\n\n    case \"one of our lead magnets\":\n      return v.dna_summaries.magnets.map((magnet) => ({\n        option: magnet.title,\n        value: magnet.id,\n      }));\n\n    case \"brand knowledge or data extracted from a document\":\n      return r.Get_Sources.data\n        .filter((source) => source.permission_given === true)\n        .map((source) => ({\n          option: source.name,\n          value: source.id,\n        }));\n\n    default:\n      return [];\n  }\n}\n\nconst options = getOptions(v.topic1chosen.toLowerCase());\n\n// Create a lookup object\nconst optionsLookup = options.reduce((acc, opt) => {\n  acc[opt.value] = opt.option;\n  return acc;\n}, {});\n\n// Store the lookup object in a Wized variable\nv.topic2OptionsLookup = optionsLookup;\n\n// Return the options as before\nreturn options;\n"
        },


               {
            "id": "f98bb607-66c4-4b37-a419-7de4a49f5dba",
            "name": "topic3options",
            "initialValue": "function getOptions(topic1chosen, topic2chosen) {\n  let options = [];\n\n  const isInChatContext = v.pageModals.moogul_chat === true || n.path === \"/library/chat\";\n\n  // Helper function to check if an array contains an item with a specific type\n  const hasItemOfType = (array, type) => {\n    return (\n      Array.isArray(array) &&\n      array.length > 0 &&\n      array.some((item) => item.type === type)\n    );\n  };\n\n  switch (topic1chosen.toLowerCase()) {\n\n       case \"an audience segment\":\n      if (isInChatContext) {\n        options = [\n          {\n            option: \"Pain points\",\n            value: \"the problems, worries or fears this audience has\",\n          },\n          { option: \"Desires\", value: \"the things this audience needs or wants\" },\n          { option: \"Objections\", value: \"objections this audience might have\" },\n          { option: \"Beliefs\", value: \"key beliefs this audience has\" },\n        ];\n      }\n      // If not in chat context, options remain empty for \"an audience segment\"\n      break;\n    case \"a product/service we offer\":\n      options = [\n        {\n          option: \"Overview\",\n          value: \"an overview of this offer/product/service\",\n        },\n        {\n          option: \"Mechanism\",\n          value: \"the unique mechanism/USP of this offer/product/service\",\n        },\n      ];\n\n      if (hasItemOfType(r.Get_ValueGen.data, \"Benefit\")) {\n        options.push({\n          option: \"Benefits\",\n          value:\n            \"Benefit: The positive, knock-on effects that occur due to the outcomes of the offer\",\n        });\n      }\n      if (hasItemOfType(r.Get_ValueGen.data, \"Outcome\")) {\n        options.push({\n          option: \"Outcomes\",\n          value:\n            \"Outcome: The tangible, positive changes or transformations that the offer creates/delivers\",\n        });\n      }\n      if (hasItemOfType(r.Get_ValueGen.data, \"Feature\")) {\n        options.push({\n          option: \"Features\",\n          value:\n            \"Feature: The tangible components of this offer. (They might include steps, stages, modules, deliverables or other component parts that help to deliver the outcome.)\",\n        });\n      }\n      if (hasItemOfType(r.Get_ValueGen.data, \"Bonus\")) {\n        options.push({\n          option: \"Bonuses\",\n          value:\n            \"Bonus: the 'extras' that are offered alongside the main offer, to help buyers overcome their deep, psychological objections.\",\n        });\n      }\n      if (hasItemOfType(r.Get_ValueGen.data, \"FAQ\")) {\n        options.push({\n          option: \"FAQs\",\n          value:\n            \"FAQ: frequently asked questions about this offer/product/service\",\n        });\n      }\n      if (hasItemOfType(r.Get_Evidence.data, \"Stat\")) {\n        options.push({\n          option: \"Stats\",\n          value:\n            \"Stat: compelling numbers that offer evidence/proof related to the effectiveness of this offer\",\n        });\n      }\n      if (hasItemOfType(r.Get_Evidence.data, \"Testimonial\")) {\n        options.push({\n          option: \"Testimonials\",\n          value:\n            \"Testimonial: existing customer/client feedback that demonstrates the effectiveness of this offer\",\n        });\n      }\n      break;\n\n    case \"a methodology, framework, process, tool or technique we use in our business\":\n      options = [\n        { option: \"Overview\", value: \"a summary/overview of this method\" },\n        {\n          option: \"Philosophy\",\n          value: \"the underlying ideas or concepts that underpin this method\",\n        },\n        {\n          option: \"Process\",\n          value:\n            \"the details of the process, steps, stages, components, flow or other aspects of this method\",\n        },\n        {\n          option: \"Goals\",\n          value:\n            \"the things this methodology aims to achieve and problems it aims to relieve\",\n        },\n        {\n          option: \"Requirements\",\n          value:\n            \"the key resources, circumstances, prior knowledge or skills required to implement this method\",\n        },\n      ];\n\n      if (hasItemOfType(r.Get_ValueGen.data, \"Outcome\")) {\n        options.push({\n          option: \"Outcomes\",\n          value: \"the outcomes achieved by using this method\",\n        });\n      }\n      if (hasItemOfType(r.Get_ValueGen.data, \"Benefit\")) {\n        options.push({\n          option: \"Benefits\",\n          value: \"the benefits that come from using this method\",\n        });\n      }\n      if (hasItemOfType(r.Get_ValueGen.data, \"Advantage\")) {\n        options.push({\n          option: \"Advantages\",\n          value: \"the advantages of this method over others\",\n        });\n      }\n      if (hasItemOfType(r.Get_Evidence.data, \"Stat\")) {\n        options.push({\n          option: \"Stats\",\n          value: \"stats relating to this method\",\n        });\n      }\n      if (hasItemOfType(r.Get_Evidence.data, \"Testimonial\")) {\n        options.push({\n          option: \"Testimonials\",\n          value: \"testimonials related to this method\",\n        });\n      }\n      break;\n\n    case \"one of our lead magnets\":\n      options = [\n        { option: \"Format\", value: \"the format of this lead magnet\" },\n        { option: \"Topic\", value: \"the topic this lead magnet covers\" },\n      ];\n\n      if (hasItemOfType(r.Get_ValueGen.data, \"Outcome\")) {\n        options.push({\n          option: \"Outcomes\",\n          value:\n            \"what using/downloading this lead magnet achieves for the audience\",\n        });\n      }\n      if (hasItemOfType(r.Get_ValueGen.data, \"Benefit\")) {\n        options.push({\n          option: \"Benefits\",\n          value:\n            \"the ways in which this lead magnet creates benefits related to its outcome\",\n        });\n      }\n      if (hasItemOfType(r.Get_Evidence.data, \"Stat\")) {\n        options.push({\n          option: \"Stats\",\n          value: \"stat relating to this lead magnet\",\n        });\n      }\n      if (hasItemOfType(r.Get_Evidence.data, \"Testimonial\")) {\n        options.push({\n          option: \"Testimonials\",\n          value: \"testimonial related to this lead magnet\",\n        });\n      }\n      break;\n\n    case \"one of the platforms we use for content\":\n      options = [\n        {\n          option: \"Overview\",\n          value: \"the summary or wider view of this platform\",\n        },\n        { option: \"Topic\", value: \"what this platform is about\" },\n        {\n          option: \"Positioning\",\n          value: \"positioning this platform for its (potential) audience\",\n        },\n      ];\n\n      if (r.Get_Episodes?.data && r.Get_Episodes?.data.length > 0) {\n        options.push({\n          option: \"Episode/post\",\n          value: \"an episode/post/edition of this content platform\",\n        });\n      }\n      break;\n\n    case \"brand knowledge or data extracted from a document\":\n      if (topic2chosen === \"Data\" || topic2chosen === \"Story\") {\n        options = r.Get_Sources.data\n          .filter((source) =>\n            source.category.some(\n              (cat) => cat.toLowerCase() === topic2chosen.toLowerCase(),\n            ),\n          )\n          .map((source) => ({\n            option: source.name,\n            value: source.id,\n          }));\n      }\n      break;\n\n    case \"a key topic we talk about\":\n      options = [{ option: \"General\", value: \"this topic in general\" }];\n\n      if (\n        r.Get_Selected_Pillar.data._subtopics_of_pillars &&\n        r.Get_Selected_Pillar.data._subtopics_of_pillars.length > 0\n      ) {\n        r.Get_Selected_Pillar.data._subtopics_of_pillars.forEach((subtopic) => {\n          options.push({\n            option: subtopic.subtopic_name,\n            value: subtopic.id,\n          });\n        });\n      }\n      break;\n  }\n\n  return options;\n}\n\n\nconst finalOptions = getOptions(v.topic1chosen, v.topic2chosen);\n\n// Create a lookup object\nconst optionsLookup = finalOptions.reduce((acc, opt) => {\n  acc[opt.value] = opt.option;\n  return acc;\n}, {});\n\n// Store the lookup object in a Wized variable\nv.topic3optionsLookup = optionsLookup;\n\n\nreturn finalOptions;",
            "computed": true
        },



## Action examples

       {
            "name": "1a. Render Topic 1 Items",
            "attributes": [
                {
                    "name": " topicbar1_items"
                }
            ],
            "id": "71a3787c-0055-4af6-8a3d-c8fab9dd1278",
            "type": "element",
            "actions": [
                {
                    "indexVariable": "da48020d-7988-47bf-9e27-0569ca1308d1",
                    "value": "return v.topic1options",
                    "setting": "list"
                },
                {
                    "type": "text",
                    "value": "return v.topic1options[v.index].option",
                    "setting": "text"
                },
                {
                    "value": "return v.topic1options[v.index].value",
                    "key": "value",
                    "setting": "attribute"
                }
            ],
            "folderId": "2abb6e94-d4ca-46c8-9efa-e4a9842e0026"
        },


        {
            "name": "chat_topic_3",
            "attributes": [
                {
                    "name": "chat_topic_3"
                }
            ],
            "id": "blW18pLh2D56SQchOc8g",
            "type": "element",
            "actions": [
                {
                    "value": "return v.topic3chosen !== \"\"",
                    "setting": "visibility"
                },
                {
                    "type": "text",
                    "value": "v.topic3chosen = i.input_topicbar_3;\n\nconst topic3Value = i.input_topicbar_3;\nconst topic3Option = v.topic3optionsLookup[topic3Value];\n\nreturn topic3Option",
                    "setting": "text"
                }
            ],
            "folderId": "6caf9d46-0d51-4477-afab-07dfbb8418c8"
        },


      {
            "name": "chat_topic_1",
            "attributes": [
                {
                    "name": "chat_topic_1"
                }
            ],
            "id": "oLg9ajpa2qwBLXj4TUrQ",
            "type": "element",
            "actions": [
                {
                    "value": "return v.topic1chosen !== \"\"",
                    "setting": "visibility"
                },
                {
                    "type": "text",
                    "value": "\nv.topic1chosen = i.input_topicbar_1;\n\nconst topic1Value = i.input_topicbar_1;\nconst topic1Option = v.topic1optionsLookup[topic1Value];\n\nreturn topic1Option",
                    "setting": "text"
                },
                {
                    "style": "background-color",
                    "value": "return 'var(--swatch--brand)'",
                    "setting": "style"
                }
            ],
            "folderId": "6caf9d46-0d51-4477-afab-07dfbb8418c8"
        },