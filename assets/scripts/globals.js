var CsParser= `//-------------------------------------------------------------------------
// <auto-generated>
// This code was generated by Zenodys Orchestration Engine
// It demonstrates integration of the Zenodys environment with C#
// <auto-generated>
//-------------------------------------------------------------------------

//Header contains information about DLL needed and directives usage, that are required for
//node compile.
//For DLL’s that are in GAC, a DLL name needs to be provided. Otherwise, the relative path the DLL in needed.
//"reference" directives should be placed before "using" directives
//<header>
//    reference MyLibs/MyLib.dll;
//    reference System.Numerics.dll;
//    using System.Numerics;
//</header>

//Each code part should be placed between the "code" tags. Tag that contains "run" attribute with "true" value
//is automatically executed by Engine and represents entry point of the executing script.
//For the code parts that returns some value, "type" attribute with "function" value needs to be provided.
<code run="true">
   //Execute "Counter" node. Every time the "Counter" node is executed, it increases or decreases it’s value by 1
   //This statement prints "1" to Instance’s Command Prompt
   Console.WriteLine(ExecuteElement("Counter"));

   //Execute "Counter" node again. Now, "2" should be printed to the "Counter" Command Prompt
   Console.WriteLine(ExecuteElement("Counter"));

    //Example of usage of the "result" tag to access nodes results.
    //Limitation of this approach is that node must already have assigned result
    //before execution of CsScript element
    ElementResultWithTag();

   //Results of node can be also set in the runtime.
   //Here, value "10" is set to the "Counter" node
   Console.WriteLine (SetElementResultDynamically("Counter",10));

   //Node properties can be also set in the runtime. Please refer to the node’s property keys in the node documentation.
   //Current value from previous call is "10"
   //"Counter step" property is increased by 20, so new value is 10 + 20 = 30
   Console.WriteLine(SetElementPropertyDynamically("Counter","COUNTER_STEP","20"));

   //Some of the nodes contain internal actions. "Counter" node, for example, contains
   //action that resets counter to the given initial value. Please refer about inner actions in the node documentation.
   //New "Counter" node result is 0 + 20 = 20.
   Console.WriteLine(CallElementActionDynamically ("Counter", "RESET_COUNTER",0));

   //Example of using custom class
   PrintCustomCounterClassProperty(Convert.ToInt32 (get_result_raw("Counter")));

   //Print node’s system informations
   PrintElementSystemInformation("Counter");
</code>

<code type="function">
   int ExecuteElement(string ElementID)
   {
       //"exec" is system function that dynamically executes node
       exec(ElementID);
       return Convert.ToInt32 (get_result_raw(ElementID));
   }
</code>

<code type="function">
   object SetElementResultDynamically (string ElementID, object Result)
   {
       //"set_result" is system function that sets node’s result in runtime
       set_result(ElementID, Result);
       //"get_result_raw" is system function that gets current node’s result
       return get_result_raw(ElementID);
   }
</code>

<code type="function">
   object SetElementPropertyDynamically (string ElementID,string Key, string Value)
   {
       //"set_element_property" is system function that sets node’s property value in runtime
       set_element_property(ElementID, Key, Value);
       exec(ElementID);
       return get_result_raw(ElementID);
   }
</code>

<code type="function">
   object CallElementActionDynamically (string ElementID,string ActionKey, int InitialValue)
   {
       Hashtable ht = new Hashtable();
       ht.Add  ("INITIAL_VALUE", InitialValue);
       //"call_element_action" is system function that calls node’s internal action.
       //parameters to the action are provided as hashtable key/value pairs
       call_element_action(ElementID, ActionKey, ht);
       exec(ElementID);
       return get_result_raw(ElementID);
   }
</code>

<code>
   void PrintCustomCounterClassProperty(int CurrentCounterValue)
   {
       Console.WriteLine("Current counter property : " + new CustomCounterClass(CurrentCounterValue).CurrentCounterValue);
   }
</code>

<code>
    void ElementResultWithTag()
    {
        //"result" tags automatically cast nodes results to correct types.
        //Console.WriteLine (<result>Counter</result>);

		//Cast fine tuning can be done with cast attribute and type value. For example:
        //<result cast="double">Counter</result>
    }
</code>

<code>
   void PrintElementSystemInformation(string ElementID)
   {
       //Error code : 0 if error didn't occur, otherwise numeric error code
       Console.WriteLine("Error code : " + ((IPlugin)_plugins[ElementID]).ErrorCode);
       //Error message : empty if error didn't occur, otherwise error message
       Console.WriteLine("Error message : " + ((IPlugin)_plugins[ElementID]).ErrorMessage);
       //Element current status (STOPPED, RUNNING)
       Console.WriteLine("Status : " + ((IPlugin)_plugins[ElementID]).Status);
       //Node’s last execution time in milliseconds
       Console.WriteLine("Execution time in ms : " + ((IPlugin)_plugins[ElementID]).MsElapsed);
       //Nodes’s last execution time
       Console.WriteLine("Last execution date time : " + ((IPlugin)_plugins[ElementID]).LastExecutionDate);
   }
</code>


<code>
   public class CustomCounterClass
   {
       public int CurrentCounterValue {get;set;}
       public CustomCounterClass(int CurrentCounterValue)
       {
           this.CurrentCounterValue = CurrentCounterValue;
       }
   }
</code>`